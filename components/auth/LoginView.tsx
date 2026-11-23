"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authErrorMessage, useAuth } from "@/lib/providers/auth-provider";
import { useToast } from "@/lib/providers/toast-provider";
import { isApiError } from "@/lib/api/errors";
import { isMockMode } from "@/lib/constants";
import { loginSchema, registerSchema, flattenZodErrors } from "@/lib/validation";
import { Icon } from "@/components/ui/Icon";

type Mode = "login" | "register";

const DEMO_ACCOUNTS = [
  { label: "审核员 · 青禾", username: "reviewer", password: "review123" },
  { label: "体验投稿者 · 阿禾", username: "demo_user", password: "password123" },
];

function safeNext(raw: string | null): string {
  if (!raw) return "";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "";
  return raw;
}

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, login, register } = useAuth();
  const { toast } = useToast();
  const next = safeNext(searchParams.get("next"));

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    const target = next || (user.role === "reviewer" ? "/review" : "/submit");
    router.replace(target);
  }, [loading, user, next, router]);

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setFields({});
    setFormError(null);
  };

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setMode("login");
    setUsername(account.username);
    setPassword(account.password);
    setFields({});
    setFormError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (mode === "login") {
      const parsed = loginSchema.safeParse({ username, password });
      if (!parsed.success) {
        setFields(flattenZodErrors(parsed.error));
        return;
      }
    } else {
      const parsed = registerSchema.safeParse({ username, password, displayName: displayName || undefined });
      if (!parsed.success) {
        setFields(flattenZodErrors(parsed.error));
        return;
      }
    }

    setSubmitting(true);
    setFields({});
    try {
      const account =
        mode === "login"
          ? await login(username.trim(), password)
          : await register(username.trim(), password, displayName.trim() || undefined);
      toast(mode === "login" ? `欢迎回来，${account.displayName}` : "账号创建成功，欢迎成为讲述者", "success");
      const target = next || (account.role === "reviewer" ? "/review" : "/submit");
      router.replace(target);
    } catch (error) {
      if (isApiError(error) && error.fields) setFields(error.fields);
      setFormError(authErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-view">
      <div className="auth-shell">
        <aside className="auth-brand">
          <div className="auth-brand-inner">
            <Link href="/" className="auth-logo">
              <span className="brand-seal">鄉</span>
              <span>乡音</span>
            </Link>
            <blockquote className="auth-quote">
              <p>“少小离家老大回，乡音无改鬓毛衰。”</p>
              <cite>—— 贺知章《回乡偶书》</cite>
            </blockquote>
            <p className="auth-brand-text">
              乡音收藏馆现在开放收录。
              你可以上传自己的录音，也可以作为审核员，帮每一段声音被认真听见。
            </p>
            <div className="auth-brand-foot">
              <span className="auth-ring" aria-hidden="true" />
              <span>方言声音 · 地方记忆 · 永久收藏</span>
            </div>
          </div>
        </aside>

        <div className="auth-panel">
          <div className="auth-tabs" role="tablist" aria-label="登录或注册">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-tab${mode === "login" ? " is-active" : ""}`}
              onClick={() => switchMode("login")}
            >
              登录
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`auth-tab${mode === "register" ? " is-active" : ""}`}
              onClick={() => switchMode("register")}
            >
              注册
            </button>
          </div>

          <h1 className="auth-title">{mode === "login" ? "欢迎回来" : "成为讲述者"}</h1>
          <p className="auth-sub">
            {mode === "login"
              ? "登录后可以投稿、管理自己的收藏，或审核待发布的内容。"
              : "注册一个账号，留下属于你那里的声音。"}
          </p>

          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="auth-username">用户名</label>
              <input
                id="auth-username"
                className={`input${fields.username ? " has-error" : ""}`}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="3–20 位字母、数字或下划线"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(fields.username)}
                aria-describedby={fields.username ? "auth-username-error" : undefined}
              />
              {fields.username ? <p className="field-error" id="auth-username-error">{fields.username}</p> : null}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="auth-password">密码</label>
              <div className="input-affix">
                <input
                  id="auth-password"
                  className={`input${fields.password ? " has-error" : ""}`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === "register" ? "至少 8 位" : "请输入密码"}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  aria-invalid={Boolean(fields.password)}
                  aria-describedby={fields.password ? "auth-password-error" : undefined}
                />
                <button
                  type="button"
                  className="affix-btn"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  <Icon name={showPassword ? "eye-off" : "eye"} size={16} />
                </button>
              </div>
              {fields.password ? <p className="field-error" id="auth-password-error">{fields.password}</p> : null}
            </div>

            {mode === "register" ? (
              <div className="field">
                <label className="field-label" htmlFor="auth-display">
                  昵称 <span className="field-optional">选填</span>
                </label>
                <input
                  id="auth-display"
                  className={`input${fields.displayName ? " has-error" : ""}`}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="展示在页面上的名字，例如：阿禾"
                  maxLength={30}
                />
                {fields.displayName ? <p className="field-error">{fields.displayName}</p> : null}
              </div>
            ) : null}

            {formError ? (
              <div className="form-alert" role="alert">
                <Icon name="alert" size={15} />
                <span>{formError}</span>
              </div>
            ) : null}

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? <span className="btn-spinner" aria-hidden="true" /> : null}
              {submitting ? "请稍候…" : mode === "login" ? "登录" : "创建账号"}
            </button>

            <p className="auth-terms">
              {mode === "register"
                ? "注册即表示你同意：只上传自己有权分享的声音，并尊重讲述者的意愿。"
                : "账号与收藏均保存在本机浏览器，仅用于演示。"}
            </p>
          </form>

          {isMockMode ? (
            <div className="demo-box">
              <div className="demo-box-head">
                <span>演示账号</span>
                <span className="demo-tag">MOCK</span>
              </div>
              <p className="demo-tip">一键填入，直接体验投稿与审核流程。</p>
              <div className="demo-accounts">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.username}
                    type="button"
                    className="demo-account"
                    onClick={() => fillDemo(account)}
                  >
                    <span>{account.label}</span>
                    <code>{account.username}</code>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="auth-back">
            <Link href="/" className="text-link">
              <Icon name="arrow-left" size={13} />
              返回首页
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}