import { hydrateRoot } from "react-dom/client";
import { Bench } from "@/components/aminoviz/bench";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
hydrateRoot(root, <Bench />);
