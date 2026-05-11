import { useState } from "react";
import { BarChart3, Check, Clock, Eye, EyeOff, Lock, Mail, ShieldCheck, Users } from "lucide-react";
import { AuthInput } from "../../components/auth/AuthInput";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { GoogleButton } from "../../components/auth/GoogleButton";
import { useAuthStore } from "../../store/authStore";

interface LoginProps {
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
}

interface LoginErrors {
  email?: string;
  password?: string;
}

export default function Login({ onNavigateToRegister, onNavigateToForgotPassword }: LoginProps) {
  const loginMock = useAuthStore((state) => state.loginMock);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});

  const validate = () => {
    const nextErrors: LoginErrors = {};
    if (!email.trim()) nextErrors.email = "Informe o e-mail.";
    if (!password) nextErrors.password = "Informe a senha.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    loginMock();
  };

  return (
    <AuthLayout
      headline={
        <>
          Simplifique a gestao.
          <br />
          <span className="text-noogym-lime">Potencialize resultados.</span>
        </>
      }
      description="O Noogym e o sistema completo para administrar sua academia e focar no que realmente importa: seus alunos."
      features={[
        {
          icon: <Users className="h-9 w-9" />,
          title: "Gestão completa",
          description: "Controle de alunos, treinos, planos, financeiro e muito mais."
        },
        {
          icon: <BarChart3 className="h-9 w-9" />,
          title: "Relatórios inteligentes",
          description: "Dados precisos para decisões estratégicas e resultados reais."
        },
        {
          icon: <ShieldCheck className="h-9 w-9" />,
          title: "Segurança garantida",
          description: "Suas informações protegidas com tecnologia de ponta."
        },
        {
          icon: <Clock className="h-9 w-9" />,
          title: "Mais tempo para você",
          description: "Automatize processos e ganhe tempo para o que importa."
        }
      ]}
      footer={
        <div className="space-y-4">
          <p>© 2026 Noogym. Todos os direitos reservados.</p>
          <p className="font-semibold text-noogym-lime">www.noogym.com</p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-7 2xl:mb-14">
          <h2 className="text-3xl font-black tracking-normal text-white 2xl:text-4xl">Bem-vindo de volta!</h2>
          <p className="mt-3 text-base text-zinc-400 2xl:mt-4 2xl:text-xl">Entre na sua conta para continuar</p>
        </div>

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
            label="Senha"
            icon={Lock}
            type={showPassword ? "text" : "password"}
            value={password}
            error={errors.password}
            placeholder="••••••••••"
            autoComplete="current-password"
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
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 2xl:mt-8">
          <label className="flex items-center gap-3 text-base text-white">
            <button
              type="button"
              className={`no-drag flex h-6 w-6 items-center justify-center rounded-md transition ${
                remember ? "bg-noogym-lime text-black" : "border border-zinc-600 bg-black/20"
              }`}
              onClick={() => setRemember((current) => !current)}
              aria-pressed={remember}
            >
              {remember ? <Check className="h-4 w-4 stroke-[3]" /> : null}
            </button>
            Lembrar de mim
          </label>
          <a
            href="#/forgot-password"
            className="no-drag text-base font-medium text-noogym-lime transition hover:text-white"
            onClick={onNavigateToForgotPassword}
            onPointerUp={onNavigateToForgotPassword}
          >
            Esqueci minha senha
          </a>
        </div>

        <button
          type="submit"
          className="no-drag mt-7 h-12 w-full rounded-lg bg-noogym-lime text-base font-bold text-black shadow-glow transition hover:bg-noogym-lime2 sm:h-14 sm:text-lg 2xl:mt-10 2xl:h-[72px] 2xl:text-xl"
        >
          Entrar
        </button>

        <div className="my-6 flex items-center gap-6 text-zinc-400 2xl:my-10">
          <span className="h-px flex-1 bg-zinc-700/70" />
          <span className="text-lg">ou</span>
          <span className="h-px flex-1 bg-zinc-700/70" />
        </div>

        <GoogleButton onClick={loginMock}>Entrar com Google</GoogleButton>

        <p className="mt-7 text-center text-base text-zinc-400 2xl:mt-12 2xl:text-lg">
          Ainda não tem uma conta?{" "}
          <button type="button" className="no-drag font-medium text-noogym-lime transition hover:text-white" onClick={onNavigateToRegister}>
            Criar conta
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
