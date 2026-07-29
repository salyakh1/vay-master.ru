export default function AdminLoading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-3 animate-pulse">
        <div className="h-8 bg-[#e5e5ea] rounded-lg w-1/2" />
        <div className="h-24 bg-[#e5e5ea] rounded-xl" />
        <div className="h-24 bg-[#e5e5ea] rounded-xl" />
        <div className="h-24 bg-[#e5e5ea] rounded-xl" />
      </div>
    </div>
  )
}
