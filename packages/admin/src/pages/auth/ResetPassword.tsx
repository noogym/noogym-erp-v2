import { useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { AuthInput } from "../../components/auth/AuthInput";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { resetPasswordWithApi } from "../../lib/api";

interface ResetPasswordProps {
  onNavigateToLogin: () => void;
}

interface ResetPasswordErrors {
  confirmPassword?: string;
  email?: string;
  form?: string;
  password?: string;
  token?: string;
}

const readResetParams = () => {
  if (typeof window === "undefined") return { email: "", token: "" };

  const searchParams = new URLSearchParams(window.location.search);
  if (!searchParams.size && window.location.hash.includes("?")) {
    const hashQuery = window.location.hash.split("?")[1] ?? "";
    return {
      email: new URLSearchParams(hashQuery).get("email") ?? "",
      token: new URLSearchParams(hashQuery).get("token") ?? "",
    };
  }

  return {
    email: searchParams.get("email") ?? "",
    token: searchParams.get("token") ?? "",
  };
};

export default function ResetPassword({ onNavigateToLogin }: ResetPasswordProps) {
  const params = useMemo(readResetParams, []);
  const [email, setEmail] = useState(params.email);
  const [token] = useState(params.token);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errors, setErrors] = useState<ResetPasswordErrors>({});

  const validate = () => {
    const nextErrors: ResetPasswordErrors = {};
    if (!email.trim()) nextErrors.email = "Informe o e-mail da conta.";
    if (!token) nextErrors.token = "Link de recuperacao invalido ou incompleto.";
    if (password.length < 8) nextErrors.password = "A senha deve ter pelo menos 8 caracteres.";
    if (password !== confirmPassword) nextErrors.confirmPassword = "As senhas devem ser iguais.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await resetPasswordWithApi({ email, token, password });
      setErrors({});
      setIsDone(true);
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Nao foi possivel redefinir a senha.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      headline={
        <>
          Crie uma nova senha
          <br />
          <span className="text-noogym-lime">e volte ao controlo.</span>
        </>
      }
      description="Defina uma senha segura para continuar a gerir a sua academia."
      features={[
        {
          icon: <ShieldCheck className="h-9 w-9" />,
          title: "Token protegido",
          description: "O link de recuperacao expira automaticamente.",
        },
        {
          icon: <Lock className="h-9 w-9" />,
          title: "Sessao renovada",
          description: "As sessoes anteriores sao revogadas ao trocar a senha.",
        },
        {
          icon: <BarChart3 className="h-9 w-9" />,
          title: "Dados preservados",
          description: "A redefinicao nao altera permissoes nem dados operacionais.",
        },
      ]}
      footer={
        <div className="space-y-4">
          <p>&copy; 2026 Noogym. Todos os direitos reservados.</p>
          <p className="font-semibold text-noogym-lime">www.noogym.com</p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <button
          type="button"
          className="no-drag mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition hover:text-noogym-lime 2xl:mb-12"
          onClick={onNavigateToLogin}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para login
        </button>

        <div className="mb-7 2xl:mb-12">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-noogym-lime/45 bg-noogym-lime/10 text-noogym-lime shadow-glow">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-black tracking-normal text-white 2xl:text-4xl">Redefinir senha</h2>
          <p className="mt-3 text-base leading-7 text-zinc-400 2xl:mt-4 2xl:text-xl 2xl:leading-8">
            Informe a nova senha para concluir a recuperacao da conta.
          </p>
        </div>

        {isDone ? (
          <div className="mb-6 rounded-lg border border-noogym-lime/40 bg-noogym-lime/10 p-4 text-sm leading-6 text-zinc-100">
            <div className="mb-2 flex items-center gap-2 font-semibold text-noogym-lime">
              <CheckCircle2 className="h-5 w-5" />
              Senha redefinida
            </div>
            A sua nova senha ja pode ser usada no login.
          </div>
        ) : null}

        {errors.token ? (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errors.token}</p>
        ) : null}

        <div className="space-y-4 2xl:space-y-7">
          <AuthInput
            label="E-mail"
            icon={Mail}
            type="email"
            value={email}
            error={errors.email}
            placeholder="seu@email.com"
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />

          <AuthInput
            label="Nova senha"
            icon={Lock}
            type={showPassword ? "text" : "password"}
            value={password}
            error={errors.password}
            placeholder="Crie uma senha segura"
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            rightElement={
              <button
                type="button"
                className="no-drag flex h-10 w-10 items-center justify-center rounded-md text-white transition hover:bg-white/10"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
              </button>
            }
          />

          <AuthInput
            label="Confirmar senha"
            icon={Lock}
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            error={errors.confirmPassword}
            placeholder="Repita a nova senha"
            autoComplete="new-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            rightElement={
              <button
                type="button"
                className="no-drag flex h-10 w-10 items-center justify-center rounded-md text-white transition hover:bg-white/10"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                title={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirmPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
              </button>
            }
          />
        </div>

        {errors.form ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errors.form}</p> : null}

        <button
          type="submit"
          disabled={isLoading || isDone}
          className="no-drag mt-7 h-12 w-full rounded-lg bg-noogym-lime text-base font-bold text-black shadow-glow transition hover:bg-noogym-lime2 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14 sm:text-lg 2xl:mt-10 2xl:h-[72px] 2xl:text-xl"
        >
          {isLoading ? "A redefinir..." : isDone ? "Senha redefinida" : "Redefinir senha"}
        </button>
      </form>
    </AuthLayout>
  );
}
