import { createFileRoute } from "@tanstack/react-router";
import { Bench } from "@/components/aminoviz/bench";

export const Route = createFileRoute("/")({ component: Bench });
