import { Metadata } from "next"

export const metadata: Metadata = {
  title: "All Integrations",
}

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
