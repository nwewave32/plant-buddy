export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-lg pb-20">
        {children}
      </main>
      {/* TODO: BottomNav from @/widgets/navigation */}
    </div>
  );
}
