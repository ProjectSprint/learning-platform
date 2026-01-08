import { env } from "@/env";
import { ClerkProvider } from "@clerk/clerk-react";

export default function AppClerkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
