import { SignalDashboard } from "@/components/signal-dashboard";
import { demoSignals } from "@/data/demo-signals";

export default function Home() {
  return <SignalDashboard initialSignals={demoSignals} />;
}
