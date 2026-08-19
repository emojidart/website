"use server"

import { cookies } from "next/headers"
import { createServerSupabaseClient } from "@/lib/supabase"

type ParticipantStatus = "going" | "maybe" | "declined"
type EventAccessType = "public" | "club"

type ActionResult = {
  success: boolean
  message: string
}

function requiredModuleForEvent(source?: string | null) {
  return source === "external" ? "external_events" : "club_events"
}

function packageLabelForEvent(source?: string | null) {
  return source === "external" ? "Externe Veranstaltungen" : "Vereinsveranstaltungen"
}

export async function saveEventParticipation(
  eventId: string,
  status: ParticipantStatus,
): Promise<ActionResult> {
  const supabase = createServerSupabaseClient(await cookies())

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: "Bitte zuerst einloggen." }
  }

  if (!eventId) {
    return { success: false, message: "Veranstaltung fehlt." }
  }

  if (!["going", "maybe", "declined"].includes(status)) {
    return { success: false, message: "Ungültiger Teilnahmestatus." }
  }

  try {
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id,source,access_type,end_date,event_date,event_time")
      .eq("id", eventId)
      .maybeSingle()

    if (eventError) throw eventError
    if (!event) return { success: false, message: "Veranstaltung wurde nicht gefunden." }

    const eventEndDate = event.end_date || event.event_date
    const eventEndTime = String(event.event_time || "23:59").slice(0, 5)
    const eventEnd = new Date(`${eventEndDate}T${eventEndTime}:00`)

    if (eventEnd.getTime() < Date.now()) {
      return { success: false, message: "Für vergangene Veranstaltungen kann der Status nicht mehr geändert werden." }
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("player_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (profileError) throw profileError

    const accessType = (event.access_type || "public") as EventAccessType
    const playerId = profile?.player_id || null

    if (accessType === "club") {
      if (!playerId) {
        return {
          success: false,
          message: "Diese Veranstaltung ist nur für Vereinsmitglieder freigeschaltet.",
        }
      }

      const requiredModule = requiredModuleForEvent(event.source)
      const today = new Date().toISOString().slice(0, 10)

      const { data: memberships, error: membershipError } = await supabase
        .from("member_memberships")
        .select("id,starts_on,ends_on,status")
        .eq("player_id", playerId)
        .eq("status", "active")
        .lte("starts_on", today)

      if (membershipError) throw membershipError

      const activeMemberships = (memberships || []).filter(
        (membership: any) => !membership.ends_on || membership.ends_on >= today,
      )

      let moduleAllowed = false

      if (activeMemberships.length > 0) {
        const membershipIds = activeMemberships.map((membership: any) => membership.id)

        const { data: moduleRow, error: moduleError } = await supabase
          .from("membership_modules")
          .select("id")
          .eq("code", requiredModule)
          .eq("is_active", true)
          .maybeSingle()

        if (moduleError) throw moduleError

        if (moduleRow?.id) {
          const { data: moduleLinks, error: moduleLinksError } = await supabase
            .from("member_membership_modules")
            .select("membership_id")
            .in("membership_id", membershipIds)
            .eq("module_id", moduleRow.id)
            .limit(1)

          if (moduleLinksError) throw moduleLinksError
          moduleAllowed = (moduleLinks || []).length > 0
        }
      }

      const { data: trials, error: trialError } = await supabase
        .from("membership_trials")
        .select("id,starts_on,ends_on,status")
        .eq("player_id", playerId)
        .eq("module_code", requiredModule)
        .eq("status", "active")
        .lte("starts_on", today)
        .gte("ends_on", today)
        .limit(1)

      if (trialError) throw trialError

      const trialAllowed = (trials || []).length > 0

      if (!moduleAllowed && !trialAllowed) {
        return {
          success: false,
          message: `Paket „${packageLabelForEvent(event.source)}“ erforderlich.`,
        }
      }
    }

    const { error: saveError } = await supabase
      .from("event_participants")
      .upsert(
        {
          event_id: eventId,
          user_id: user.id,
          player_id: playerId,
          status,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "event_id,user_id",
        },
      )

    if (saveError) throw saveError

    return {
      success: true,
      message:
        status === "going"
          ? "Du bist als dabei eingetragen."
          : status === "maybe"
            ? "Du bist als vielleicht eingetragen."
            : "Deine Absage wurde gespeichert.",
    }
  } catch (error: any) {
    console.error("saveEventParticipation error:", error)
    return {
      success: false,
      message: error?.message || "Teilnahmestatus konnte nicht gespeichert werden.",
    }
  }
}
