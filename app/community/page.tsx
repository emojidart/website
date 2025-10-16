"use client"

import type React from "react"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect, useRef } from "react"
import {
  Heart,
  MessageCircle,
  Send,
  Users,
  Lock,
  TrendingUp,
  ImageIcon,
  Loader2,
  X,
  Trash2,
  ArrowLeft,
  Pencil,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { AuthModal } from "@/components/auth-modal"
import { DeleteModal } from "@/components/delete-modal"
import { useRouter } from "next/navigation"

interface UserProfile {
  id: string
  user_id: string
  player_id: string
  club_players: {
    id: string
    name: string
    photo_url: string | null
  } | null
}

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  userName: string
  userAvatar: string | null
}

interface Post {
  id: string
  user_id: string
  content: string
  image_url: string | null
  created_at: string
  likes: { user_id: string }[]
  comments: { id: string; user_id: string; content: string; created_at: string }[]
}

interface PostWithUser extends Post {
  userName: string
  userAvatar: string | null
  commentsWithUsers: Comment[]
}

export default function CommunityPage() {
  const { session, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [newPost, setNewPost] = useState("")
  const [posts, setPosts] = useState<PostWithUser[]>([])
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState("")
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPosting, setIsPosting] = useState(false)
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; action: "post" | "like" | "comment" }>({
    isOpen: false,
    action: "post",
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    type: "post" | "comment"
    id: string
    postId?: string
  }>({
    isOpen: false,
    type: "post",
    id: "",
  })

  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/member-login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    fetchPosts()
    if (session?.user) {
      fetchProfile()
    } else {
      setLoading(false)
    }

    const postsChannel = supabase
      .channel("posts-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
        console.log("[v0] New post detected, refreshing...")
        fetchPosts()
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, () => {
        console.log("[v0] Post deleted, refreshing...")
        fetchPosts()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, () => {
        console.log("[v0] Post updated, refreshing...")
        fetchPosts()
      })
      .subscribe()

    const likesChannel = supabase
      .channel("likes-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "likes" }, () => {
        console.log("[v0] New like detected, refreshing...")
        fetchPosts()
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "likes" }, () => {
        console.log("[v0] Like removed, refreshing...")
        fetchPosts()
      })
      .subscribe()

    const commentsChannel = supabase
      .channel("comments-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, () => {
        console.log("[v0] New comment detected, refreshing...")
        fetchPosts()
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "comments" }, () => {
        console.log("[v0] Comment deleted, refreshing...")
        fetchPosts()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "comments" }, () => {
        console.log("[v0] Comment updated, refreshing...")
        fetchPosts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(postsChannel)
      supabase.removeChannel(likesChannel)
      supabase.removeChannel(commentsChannel)
    }
  }, [session])

  const fetchPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          id,
          user_id,
          content,
          image_url,
          created_at,
          likes (user_id),
          comments (id, user_id, content, created_at)
        `)
        .order("created_at", { ascending: false })

      if (postsError) {
        console.error("[v0] Error fetching posts:", postsError)
        setLoading(false)
        return
      }

      if (!postsData || postsData.length === 0) {
        setPosts([])
        setLoading(false)
        return
      }

      const postUserIds = postsData.map((post) => post.user_id)
      const commentUserIds = postsData.flatMap((post) => post.comments.map((comment) => comment.user_id))
      const allUserIds = [...new Set([...postUserIds, ...commentUserIds])]

      const { data: profilesData, error: profilesError } = await supabase
        .from("user_profiles")
        .select(`user_id, club_players (id, name, photo_url)`)
        .in("user_id", allUserIds)

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
      }

      const profilesMap = new Map()
      if (profilesData) {
        profilesData.forEach((profile) => {
          profilesMap.set(profile.user_id, profile)
        })
      }

      const postsWithUsers: PostWithUser[] = postsData.map((post) => {
        const userProfile = profilesMap.get(post.user_id)

        const commentsWithUsers: Comment[] = post.comments.map((comment) => {
          const commentUserProfile = profilesMap.get(comment.user_id)
          return {
            ...comment,
            userName: commentUserProfile?.club_players?.name || "Unbekannt",
            userAvatar: commentUserProfile?.club_players?.photo_url || null,
          }
        })

        return {
          ...post,
          userName: userProfile?.club_players?.name || "Unbekannt",
          userAvatar: userProfile?.club_players?.photo_url || null,
          commentsWithUsers,
        }
      })

      setPosts(postsWithUsers)
    } catch (err) {
      console.error("Error in fetchPosts:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async () => {
    if (!session) return

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select(`id, user_id, player_id, club_players (id, name, photo_url)`)
        .eq("user_id", session.user.id)
        .single()

      if (profileError) {
        console.error("Error fetching profile:", profileError)
      } else {
        setProfile(profileData)
      }
    } catch (err) {
      console.error("Error fetching profile:", err)
    }
  }

  const getUserName = () => {
    if (!session) return "Unbekannt"
    if (profile?.club_players?.name) return profile.club_players.name
    return "Mitglied"
  }

  const getUserAvatar = () => {
    if (profile?.club_players?.photo_url) return profile.club_players.photo_url
    return "/placeholder-user.jpg"
  }

  const getUserInitials = () => {
    if (!user) return "?"
    const name = getUserName()
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleCreatePost = async () => {
    if (!session) {
      setAuthModal({ isOpen: true, action: "post" })
      return
    }
    if (!newPost.trim()) return

    setIsPosting(true)
    try {
      let imageUrl: string | null = null

      if (selectedImage) {
        setIsUploading(true)

        const fileExt = selectedImage.name.split(".").pop()
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
        const filePath = `${session.user.id}/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("community-photos")
          .upload(filePath, selectedImage, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) {
          console.error("Error uploading image:", uploadError)
          alert("Fehler beim Hochladen des Bildes")
          setIsUploading(false)
          setIsPosting(false)
          return
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("community-photos").getPublicUrl(filePath)

        imageUrl = publicUrl
        setIsUploading(false)
      }

      const { error } = await supabase.from("posts").insert({
        user_id: session.user.id,
        content: newPost,
        image_url: imageUrl,
      })

      if (error) {
        console.error("Error creating post:", error)
        alert("Fehler beim Erstellen des Beitrags")
      } else {
        setNewPost("")
        handleRemoveImage()
        await fetchPosts()
      }
    } catch (err) {
      console.error("Error creating post:", err)
      alert("Fehler beim Erstellen des Beitrags")
    } finally {
      setIsPosting(false)
      setIsUploading(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!session) {
      setAuthModal({ isOpen: true, action: "like" })
      return
    }

    const post = posts.find((p) => p.id === postId)
    if (!post) return

    const hasLiked = post.likes.some((like) => like.user_id === session.user.id)

    try {
      if (hasLiked) {
        const { error } = await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", session.user.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("likes").insert({
          post_id: postId,
          user_id: session.user.id,
        })

        if (error) throw error
      }

      await fetchPosts()
    } catch (err) {
      console.error("Error toggling like:", err)
      alert("Fehler beim Liken des Beitrags")
    }
  }

  const handleComment = async (postId: string) => {
    if (!session) {
      setAuthModal({ isOpen: true, action: "comment" })
      return
    }
    if (!commentText.trim()) return

    try {
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: session.user.id,
        content: commentText,
      })

      if (error) throw error

      setCommentText("")
      setActiveCommentId(null)
      await fetchPosts()
    } catch (err) {
      console.error("Error creating comment:", err)
      alert("Fehler beim Kommentieren")
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!session) return

    setDeleteModal({ isOpen: true, type: "post", id: postId })
  }

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!session) return

    setDeleteModal({ isOpen: true, type: "comment", id: commentId, postId })
  }

  const executeDelete = async () => {
    if (!session) return

    try {
      if (deleteModal.type === "post") {
        const { error } = await supabase.from("posts").delete().eq("id", deleteModal.id).eq("user_id", session.user.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("comments")
          .delete()
          .eq("id", deleteModal.id)
          .eq("user_id", session.user.id)

        if (error) throw error
      }

      await fetchPosts()
    } catch (err) {
      console.error(`Error deleting ${deleteModal.type}:`, err)
      alert(`Fehler beim Löschen des ${deleteModal.type === "post" ? "Beitrags" : "Kommentars"}`)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Captain":
        return "👑"
      case "Co-Captain":
        return "🛡️"
      default:
        return ""
    }
  }

  const getPostAuthorName = (post: PostWithUser) => {
    return post.userName
  }

  const getPostAuthorAvatar = (post: PostWithUser) => {
    return post.userAvatar || "/placeholder-user.jpg"
  }

  const getPostTimestamp = (createdAt: string) => {
    const now = new Date()
    const postDate = new Date(createdAt)
    const diffMs = now.getTime() - postDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "gerade eben"
    if (diffMins < 60) return `vor ${diffMins} Minute${diffMins > 1 ? "n" : ""}`
    if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours > 1 ? "n" : ""}`
    return `vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`
  }

  const hasUserLikedPost = (post: Post) => {
    if (!session) return false
    return post.likes.some((like) => like.user_id === session.user.id)
  }

  const totalPosts = posts.length
  const totalLikes = posts.reduce((sum, post) => sum + post.likes.length, 0)
  const totalComments = posts.reduce((sum, post) => sum + post.comments.length, 0)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Bild ist zu groß. Maximal 5MB erlaubt.")
        return
      }
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleEditPost = (postId: string, currentContent: string) => {
    setEditingPostId(postId)
    setEditContent(currentContent)
  }

  const handleSaveEditPost = async (postId: string) => {
    if (!session || !editContent.trim()) return

    console.log("[v0] Attempting to update post:", postId)
    console.log("[v0] New content:", editContent)
    console.log("[v0] User ID:", session.user.id)

    try {
      const { data, error } = await supabase
        .from("posts")
        .update({ content: editContent })
        .eq("id", postId)
        .eq("user_id", session.user.id)

      if (error) {
        console.error("[v0] Error updating post:", error)
        throw error
      }

      console.log("[v0] Post updated successfully:", data)

      setEditingPostId(null)
      setEditContent("")
      await fetchPosts()
    } catch (err) {
      console.error("[v0] Error in handleSaveEditPost:", err)
      alert("Fehler beim Bearbeiten des Beitrags. Hast du das SQL-Script 05-enable-edit-permissions.sql ausgeführt?")
    }
  }

  const handleCancelEdit = () => {
    setEditingPostId(null)
    setEditingCommentId(null)
    setEditContent("")
  }

  const handleEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId)
    setEditContent(currentContent)
  }

  const handleSaveEditComment = async (commentId: string) => {
    if (!session || !editContent.trim()) return

    console.log("[v0] Attempting to update comment:", commentId)
    console.log("[v0] New content:", editContent)
    console.log("[v0] User ID:", session.user.id)

    try {
      const { data, error } = await supabase
        .from("comments")
        .update({ content: editContent })
        .eq("id", commentId)
        .eq("user_id", session.user.id)

      if (error) {
        console.error("[v0] Error updating comment:", error)
        throw error
      }

      console.log("[v0] Comment updated successfully:", data)

      setEditingCommentId(null)
      setEditContent("")
      await fetchPosts()
    } catch (err) {
      console.error("[v0] Error in handleSaveEditComment:", err)
      alert("Fehler beim Bearbeiten des Kommentars. Hast du das SQL-Script 05-enable-edit-permissions.sql ausgeführt?")
    }
  }

  if (authLoading || (loading && !posts.length)) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-orange-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Lädt...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl">
        <Button
          variant="outline"
          onClick={() => router.push("/member-profile")}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Profil
        </Button>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl mb-4 sm:mb-6 shadow-xl">
            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">Feed</h1>
          <p className="text-base sm:text-lg text-gray-600 text-balance px-4">Poste, kommentiere und bleib verbunden</p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 mx-auto mb-2" />
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalPosts}</div>
              <div className="text-xs sm:text-sm text-gray-600">Beiträge</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 mx-auto mb-2" />
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalLikes}</div>
              <div className="text-xs sm:text-sm text-gray-600">Likes</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalComments}</div>
              <div className="text-xs sm:text-sm text-gray-600">Kommentare</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-orange-200">
                <AvatarImage src={session ? getUserAvatar() : undefined} alt="Du" />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-sm sm:text-base">
                  {session ? getUserInitials() : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-grow min-w-0">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                  {loading ? "Lädt..." : session ? getUserName() : "Nicht angemeldet"}
                </h3>
                {!session && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Melde dich an, um zu posten
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Textarea
              placeholder={
                session
                  ? "Was möchtest du mit der Community teilen? "
                  : "Melde dich an, um einen Beitrag zu erstellen..."
              }
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              disabled={!session || isPosting}
              className="min-h-[100px] mb-4 border-2 border-gray-200 focus:border-orange-500 resize-none text-sm sm:text-base"
            />
            {imagePreview && (
              <div className="relative mb-4 rounded-lg overflow-hidden border-2 border-gray-200">
                <img
                  src={imagePreview || "/placeholder-user.jpg"}
                  alt="Preview"
                  className="w-full max-h-64 object-cover"
                />
                <Button
                  onClick={handleRemoveImage}
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2 rounded-full w-8 h-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <Button
                variant="outline"
                size="sm"
                disabled={!session || isPosting}
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-600 hover:text-orange-600 bg-transparent text-xs sm:text-sm"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Bild hinzufügen
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={!session || !newPost.trim() || isPosting || isUploading}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold shadow-lg text-xs sm:text-sm"
              >
                {isPosting || isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isUploading ? "Lädt Bild hoch..." : "Wird gepostet..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Posten
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 text-orange-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Lade Beiträge...</p>
          </div>
        ) : posts.length === 0 ? (
          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Noch keine Beiträge</h3>
              <p className="text-gray-600">Sei der Erste und teile etwas mit der Community!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {posts.map((post) => (
              <Card key={post.id} className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-orange-200 flex-shrink-0">
                      <AvatarImage
                        src={getPostAuthorAvatar(post) || "/placeholder-user.jpg"}
                        alt={getPostAuthorName(post)}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-sm sm:text-base">
                        {getPostAuthorName(post)
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base">{getPostAuthorName(post)}</h3>
                        <span className="text-base sm:text-lg">{getRoleIcon("Spieler")}</span>
                      </div>
                      <p className="text-xs text-gray-500">{getPostTimestamp(post.created_at)}</p>
                    </div>
                    {session && session.user.id === post.user_id && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPost(post.id, post.content)}
                          className="text-gray-400 hover:text-blue-600 p-2"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                          className="text-gray-400 hover:text-red-600 p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {editingPostId === post.id ? (
                    <div className="mb-4">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px] mb-2 border-2 border-orange-500 focus:border-orange-600 resize-none text-sm sm:text-base"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="text-xs sm:text-sm bg-transparent"
                        >
                          Abbrechen
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEditPost(post.id)}
                          disabled={!editContent.trim()}
                          className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-xs sm:text-sm"
                        >
                          Speichern
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-800 mb-4 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                      {post.content}
                    </p>
                  )}

                  {post.image_url && (
                    <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={post.image_url || "/placeholder-user.jpg"}
                        alt="Post image"
                        className="w-full max-h-96 object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 sm:gap-4 pt-4 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${
                        hasUserLikedPost(post) ? "text-red-600 hover:text-red-700" : "text-gray-600 hover:text-red-600"
                      }`}
                    >
                      <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${hasUserLikedPost(post) ? "fill-current" : ""}`} />
                      <span className="font-semibold">{post.likes.length}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveCommentId(activeCommentId === post.id ? null : post.id)}
                      className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-blue-600 text-xs sm:text-sm"
                    >
                      <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="font-semibold">{post.comments.length}</span>
                    </Button>
                  </div>

                  {activeCommentId === post.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {post.commentsWithUsers.length > 0 && (
                        <div className="mb-4 space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700">Kommentare</h4>
                          {post.commentsWithUsers.map((comment) => (
                            <div key={comment.id} className="flex gap-2 bg-gray-50 p-3 rounded-lg">
                              <Avatar className="w-8 h-8 border-2 border-orange-200 flex-shrink-0">
                                <AvatarImage
                                  src={comment.userAvatar || "/placeholder-user.jpg"}
                                  alt={comment.userName}
                                />
                                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold">
                                  {comment.userName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-gray-900">{comment.userName}</span>
                                  <span className="text-xs text-gray-500">{getPostTimestamp(comment.created_at)}</span>
                                </div>
                                {editingCommentId === comment.id ? (
                                  <div>
                                    <Textarea
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      className="min-h-[60px] mb-2 border-2 border-orange-500 focus:border-orange-600 resize-none text-sm"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCancelEdit}
                                        className="text-xs bg-transparent"
                                      >
                                        Abbrechen
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveEditComment(comment.id)}
                                        disabled={!editContent.trim()}
                                        className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-xs"
                                      >
                                        Speichern
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                    {comment.content}
                                  </p>
                                )}
                              </div>
                              {session && session.user.id === comment.user_id && (
                                <div className="flex flex-col gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditComment(comment.id, comment.content)}
                                    className="text-gray-400 hover:text-blue-600 p-1 h-auto flex-shrink-0"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteComment(comment.id, post.id)}
                                    className="text-gray-400 hover:text-red-600 p-1 h-auto flex-shrink-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {session ? (
                        <div className="flex gap-2">
                          <Avatar className="w-8 h-8 border-2 border-orange-200 flex-shrink-0">
                            <AvatarImage src={getUserAvatar() || "/placeholder-user.jpg"} alt="Du" />
                            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold">
                              {getUserInitials()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-grow min-w-0">
                            <Textarea
                              placeholder="Schreibe einen Kommentar..."
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              className="min-h-[60px] mb-2 border-2 border-gray-200 focus:border-orange-500 resize-none text-sm"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setActiveCommentId(null)
                                  setCommentText("")
                                }}
                                className="text-xs sm:text-sm"
                              >
                                Abbrechen
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleComment(post.id)}
                                disabled={!commentText.trim()}
                                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-xs sm:text-sm"
                              >
                                Kommentieren
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                          <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-xs sm:text-sm text-gray-600 mb-3">Melde dich an, um zu kommentieren</p>
                          <Button
                            size="sm"
                            onClick={() => (window.location.href = "/member-login")}
                            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-xs sm:text-sm"
                          >
                            Jetzt anmelden
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        action={authModal.action}
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={executeDelete}
        type={deleteModal.type}
      />
    </div>
  )
}
