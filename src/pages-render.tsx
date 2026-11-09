import { renderToString } from "react-dom/server";
import { Bench } from "@/components/aminoviz/bench";

export function renderBench(): string {
  return renderToString(<Bench />);
}
