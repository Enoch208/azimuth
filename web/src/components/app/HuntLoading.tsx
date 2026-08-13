export function HuntLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="h-3 w-28 bg-paper-sunk" />
      <div className="mt-4 h-10 w-64 bg-paper-deep sm:w-80" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="aspect-square max-w-[38rem] rounded-panel border-2 border-ink bg-paper-deep" />
        <div className="flex flex-col gap-5">
          <div className="h-44 rounded-card border-2 border-ink bg-paper-raised" />
          <div className="h-28 rounded-card border-2 border-ink bg-gold" />
        </div>
      </div>
    </div>
  );
}
