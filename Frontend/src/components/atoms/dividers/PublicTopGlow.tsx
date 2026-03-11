export default function PublicTopGlow() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden py-5">
      <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-2xl" />
      <div className="absolute -top-28 left-[12%] h-56 w-56 rounded-full blur-2xl" />
      <div className="absolute -top-28 right-[10%] h-64 w-64 rounded-full blur-2xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-red-500" />
    </div>
  );
}
