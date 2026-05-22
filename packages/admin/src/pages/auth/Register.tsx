import { useState } from "react";
import { BarChart3, Calendar, Check, DollarSign, Eye, EyeOff, Lock, Mail, Phone, User, Users } from "lucide-react";
import { AuthInput } from "../../components/auth/AuthInput";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { GoogleButton } from "../../components/auth/GoogleButton";
import { useAppStore } from "../../store/appStore";
import { useAuthStore } from "../../store/authStore";

interface RegisterProps {
  onNavigateToLogin: () => void;
}

interface RegisterErrors {
  name?: string;
  gymName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  form?: string;
}

export default function Register({ onNavigateToLogin }: RegisterProps) {
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const register = useAuthStore((state) => state.register);
  const registerMock = useAuthStore((state) => state.registerMock);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [name, setName] = useState("");
  const [gymName, setGymName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});

  const validate = () => {
    const nextErrors: RegisterErrors = {};
    if (!name.trim()) nextErrors.name = "Informe seu nome.";
    if (onlineOnly && !gymName.trim()) nextErrors.gymName = "Informe o nome do ginasio.";
    if (!email.trim()) nextErrors.email = "Informe o e-mail.";
    if (!password) nextErrors.password = "Informe a senha.";
    if (!confirmPassword) nextErrors.confirmPassword = "Confirme a senha.";
    if (password && confirmPassword && password !== confirmPassword) nextErrors.confirmPassword = "As senhas devem ser iguais.";
    if (!acceptedTerms) nextErrors.terms = "Aceite os termos para continuar.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    try {
      if (onlineOnly) {
        await register({ name, email, password, phone, organizationName: gymName });
        return;
      }

      registerMock(name);
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Nao foi possivel criar a conta."
      });
    }
  };

  const handleGoogleRegister = () => {
    if (onlineOnly) {
      setErrors({ form: "Cadastro com Google ainda nao esta configurado na API." });
      return;
    }

    registerMock("Admin");
  };

  return (
    <AuthLayout
      compactFeatures
      headline={
        <>
          O sistema completo para
          <br />
          <span className="text-noogym-lime">gestão do seu ginásio.</span>
        </>
      }
      description="Mais controle, organização e resultados para você e seus alunos."
      features={[
        {
          icon: <Users className="h-9 w-9" />,
          title: "Gestão de alunos",
          description: "Cadastre, organize e acompanhe seus alunos de forma simples."
        },
        {
          icon: <Calendar className="h-9 w-9" />,
          title: "Agendamentos e treinos",
          description: "Crie treinos, agende horários e acompanhe a evolução."
        },
        {
          icon: <DollarSign className="h-9 w-9" />,
          title: "Financeiro integrado",
          description: "Controle planos, pagamentos e recebimentos em um só lugar."
        },
        {
          icon: <BarChart3 className="h-9 w-9" />,
          title: "Relatórios inteligentes",
          description: "Dados e indicadores para tomar decisões melhores todos os dias."
        }
      ]}
      footer={<p>Junte-se a milhares de academias que já transformaram sua gestão com <span className="text-noogym-lime">Noogym.</span></p>}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-5 2xl:mb-8">
          <h2 className="text-3xl font-black tracking-normal text-white 2xl:text-4xl">Criar sua conta</h2>
          <p className="mt-3 text-base text-zinc-400 2xl:mt-4 2xl:text-xl">Comece agora e transforme a gestão do seu ginásio.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:gap-6">
          <AuthInput
            label="Nome completo"
            icon={User}
            value={name}
            error={errors.name}
            placeholder="Seu nome completo"
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
          />
          <AuthInput
            label="Nome do ginasio"
            icon={Users}
            value={gymName}
            error={errors.gymName}
            placeholder="Noogym Fitness Center"
            autoComplete="organization"
            onChange={(event) => setGymName(event.target.value)}
          />
          <AuthInput
            label="Telefone (opcional)"
            icon={Phone}
            value={phone}
            placeholder="(11) 99999-9999"
            autoComplete="tel"
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>

        <div className="mt-4 space-y-4 2xl:mt-6 2xl:space-y-6">
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
            helperText="Mínimo de 8 caracteres com número e letra."
            placeholder="Crie uma senha"
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
            placeholder="Confirme sua senha"
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

        <div className="mt-5 2xl:mt-8">
          <label className="flex items-start gap-3 text-sm leading-6 text-white 2xl:gap-4 2xl:text-base 2xl:leading-7">
            <button
              type="button"
              className={`no-drag mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition ${
                acceptedTerms ? "bg-noogym-lime text-black" : "border border-zinc-600 bg-black/20"
              }`}
              onClick={() => setAcceptedTerms((current) => !current)}
              aria-pressed={acceptedTerms}
            >
              {acceptedTerms ? <Check className="h-4 w-4 stroke-[3]" /> : null}
            </button>
            <span>
              Eu concordo com os <span className="text-noogym-lime">Termos de Uso</span> e a{" "}
              <span className="text-noogym-lime">Política de Privacidade.</span>
            </span>
          </label>
          {errors.terms ? <p className="mt-2 text-sm text-red-400">{errors.terms}</p> : null}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="no-drag mt-6 h-12 w-full rounded-lg bg-noogym-lime text-base font-bold text-black shadow-glow transition hover:bg-noogym-lime2 sm:h-14 sm:text-lg 2xl:mt-9 2xl:h-[72px] 2xl:text-xl"
        >
          {isLoading ? "A criar conta..." : "Criar conta"}
        </button>

        <div className="my-6 flex items-center gap-6 text-zinc-400 2xl:my-9">
          <span className="h-px flex-1 bg-zinc-700/70" />
          <span className="text-lg">ou</span>
          <span className="h-px flex-1 bg-zinc-700/70" />
        </div>

        <GoogleButton onClick={handleGoogleRegister}>Cadastrar com Google</GoogleButton>

        <p className="mt-7 text-center text-base text-zinc-400 2xl:mt-10 2xl:text-lg">
          Já tem uma conta?{" "}
          <button type="button" className="no-drag font-medium text-noogym-lime transition hover:text-white" onClick={onNavigateToLogin}>
            Fazer login
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
