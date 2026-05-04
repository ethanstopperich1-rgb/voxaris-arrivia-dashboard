// Root → live ops. Anyone hitting the bare domain lands on the dashboard.
import { redirect } from "next/navigation";

export const dynamic = "force-static";

export default function Home() {
  redirect("/dashboard");
}
