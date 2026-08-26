import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { Label } from "@/elements/form/label";
import { Input } from "@/elements/form/input";
import { Button } from "@/elements/ui/button";
import { AuthPageLayout } from "@/layouts/auth";
import { authStore } from "@/stores/auth-store";

const VerifyPage = observer(function VerifyPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await authStore.confirmSignUp(code);
    if (authStore.state === "unauthenticated") {
      navigate("/signin");
    }
  };

  return (
    <AuthPageLayout>
      <div className="flex flex-col flex-1">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div>
            <div className="mb-5 sm:mb-8">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Verify Your Email
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We sent a verification code to{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {authStore.pendingEmail}
                </span>
                . Enter it below to confirm your account.
              </p>
            </div>
            <div>
              {authStore.error && (
                <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                  {authStore.error}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div>
                    <Label>
                      Verification Code{" "}
                      <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Button
                      className="w-full"
                      size="sm"
                      disabled={authStore.isLoading}
                    >
                      {authStore.isLoading ? "Verifying..." : "Verify Account"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AuthPageLayout>
  );
});

export default VerifyPage;
