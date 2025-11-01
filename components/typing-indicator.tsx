export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-orange-600 text-white px-4 py-3 rounded-lg max-w-[70%]">
        <div className="flex gap-1 items-center">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  )
}
