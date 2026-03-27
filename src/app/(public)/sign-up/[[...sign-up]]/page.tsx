import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Frontier GL
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your account
        </p>
      </div>
      <SignUp />
    </div>
  );
}
