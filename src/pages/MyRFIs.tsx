import { rfis } from "@/lib/mockData";
import { RFISplitPanel } from "@/components/RFISplitPanel";

export default function MyRFIs() {
  return (
    <div className="container max-w-6xl py-8 animate-fade-in">
      <h1 className="text-xl font-bold mb-6">My RFIs</h1>
      <RFISplitPanel rfis={rfis} className="h-[calc(100vh-10rem)]" />
    </div>
  );
}
