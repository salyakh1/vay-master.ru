export default function ChatDetailLoading() {
  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto w-full pb-24 animate-pulse">
      <div className="h-12 border-b border-[#efefef] bg-[#fafafa]" />
      <div className="px-4 py-4 space-y-3">
        <div className="h-10 bg-[#f0f0f0] rounded-2xl w-2/3" />
        <div className="h-10 bg-[#f0f0f0] rounded-2xl w-1/2 ml-auto" />
        <div className="h-10 bg-[#f0f0f0] rounded-2xl w-3/4" />
      </div>
    </div>
  )
}
