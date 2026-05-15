import { ControlButton, ControlInput } from "./controls";

/** @param {{password:string,setPassword:Function,handleStepUp:Function,error:string}} props */
export function AuthGateCard({ password, setPassword, handleStepUp, error }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Payments Panel</h1>
      <p className="mt-1 text-sm text-slate-500">
        Super admin step-up password required.
      </p>
      <div className="mt-5 flex max-w-md gap-2">
        <ControlInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter payments password"
          className="w-full"
        />
        <ControlButton
          onClick={handleStepUp}
          disabled={!password}
          variant="primary"
          className="px-4"
        >
          Unlock
        </ControlButton>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
