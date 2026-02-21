export function WindowControls(): JSX.Element {
  return (
    <div className="flex gap-2.5">
      <div
        onClick={() => window.api.window.minimize()}
        title="Minimize"
        className="window-control bg-warning"
      />
      <div
        onClick={() => window.api.window.maximize()}
        title="Maximize"
        className="window-control bg-accent"
      />
      <div
        onClick={() => window.api.window.close()}
        title="Close"
        className="window-control bg-danger"
      />
    </div>
  )
}
