import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getInternalUser } from "@/lib/db/entity-access";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

/**
 * Onboarding wizard page for a specific entity.
 * Server component that verifies auth + entity access,
 * then renders the client-side wizard container.
 */
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ entityId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { entityId } = await params;

  const user = await getInternalUser(userId);
  if (!user) redirect("/sign-in");

  const access = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: user.id } },
    include: { entity: true },
  });

  if (!access) redirect("/dashboard");

  return (
    <OnboardingWizard
      entityId={entityId}
      entityName={access.entity.name}
    />
  );
}
