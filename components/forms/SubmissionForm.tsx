"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { ApiError, errorMessage } from "@/lib/api/errors";
import {
  CONTENT_TYPES,
  FILE_RULES,
  RECORDING_AUTH_TEXT,
  formatDuration,
  isMockMode,
} from "@/lib/constants";
import { flattenZodErrors, submissionInputSchema } from "@/lib/validation";
import { readAudioDuration, uploadToSignedUrl, validateFile } from "@/lib/upload";
import type {
  ContentType,
  LanguageOption,
  RegionOption,
  SignResponse,
  SubmissionDetail,
  SubmitterCreditMode,
  VisualType,
} from "@/lib/types";
import { useToast } from "@/lib/providers/toast-provider";
import { Icon } from "@/components/ui/Icon";
import { LoadingBlock, ErrorState } from "@/components/ui/State";
import { UploadField } from "./UploadField";
import { SubtitleEditor, type EditableSubtitle } from "./SubtitleEditor";

type FormErrors = Record<string, string>;

async function urlToFile(url: string, name: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("无法读取现有文件");
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || "audio/wav" });
}

function ext(name: string): string {
  return name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : "";
}

export function SubmissionForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: SubmissionDetail;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState(false);
  const [optionsAttempt, setOptionsAttempt] = useState(0);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [contentType, setContentType] = useState<ContentType>(initial?.contentType ?? "story");
  const [languageId, setLanguageId] = useState(initial?.language?.id ?? "");
  const [regionId, setRegionId] = useState(initial?.region.id ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [translation, setTranslation] = useState(initial?.translationZh ?? "");
  const [culture, setCulture] = useState(initial?.cultureContext ?? "");
  const [creditMode, setCreditMode] = useState<SubmitterCreditMode>(
    initial?.submitterCredit.mode ?? "anonymous",
  );
  const [creditName, setCreditName] = useState(
    initial?.submitterCredit.mode === "nickname" ? initial?.submitterCredit.name ?? "" : "",
  );
  const [subtitles, setSubtitles] = useState<EditableSubtitle[]>(
    initial?.subtitleSegments.map((segment) => ({ start: segment.start, text: segment.text })) ?? [],
  );

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(initial?.audio.durationSeconds ?? null);
  const [visualMode, setVisualMode] = useState<VisualType | "">(initial?.visual?.type ?? "");
  const [visualFile, setVisualFile] = useState<File | null>(null);
  const [removeVisual, setRemoveVisual] = useState(false);
  const [recordingAuthorized, setRecordingAuthorized] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [stageText, setStageText] = useState("");
  const [audioProgress, setAudioProgress] = useState<number | undefined>(undefined);
  const [visualProgress, setVisualProgress] = useState<number | undefined>(undefined);

  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(initial?.audio.url ?? null);
  const [visualPreviewUrl, setVisualPreviewUrl] = useState<string | null>(
    initial?.visual && !removeVisual ? initial.visual.url : null,
  );

  useEffect(() => {
    let active = true;
    setOptionsLoading(true);
    setOptionsError(false);
    Promise.all([
      api.get<LanguageOption[]>("/languages?scope=all"),
      api.get<RegionOption[]>("/regions?scope=all"),
    ])
      .then(([languageOptions, regionOptions]) => {
        if (!active) return;
        setLanguages(languageOptions);
        setRegions(regionOptions);
      })
      .catch(() => {
        if (active) setOptionsError(true);
      })
      .finally(() => {
        if (active) setOptionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [optionsAttempt]);

  useEffect(() => {
    if (!audioFile) {
      setAudioPreviewUrl(initial?.audio.url ?? null);
      return;
    }
    const url = URL.createObjectURL(audioFile);
    setAudioPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile, initial?.audio.url]);

  useEffect(() => {
    if (!visualFile) {
      setVisualPreviewUrl(initial?.visual && !removeVisual ? initial.visual.url : null);
      return;
    }
    const url = URL.createObjectURL(visualFile);
    setVisualPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [visualFile, removeVisual, initial?.visual]);

  const existingVisualVisible = Boolean(
    initial?.visual && !removeVisual && visualMode === initial.visual.type && !visualFile,
  );
  const hasVisual = Boolean(visualFile || existingVisualVisible);

  const clearError = (key: string) => {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleAudioSelect = async (file: File) => {
    const message = validateFile(file, FILE_RULES.audio);
    if (message) {
      setErrors((current) => ({ ...current, audio: message }));
      return;
    }
    clearError("audio");
    setAudioFile(file);
    const duration = await readAudioDuration(file);
    if (duration != null) setAudioDuration(duration);
  };

  const handleVisualSelect = (file: File) => {
    const type: VisualType = file.type.startsWith("video") || ["mp4", "webm"].includes(ext(file.name)) ? "video" : "image";
    const rules = type === "video" ? FILE_RULES.video : FILE_RULES.image;
    const message = validateFile(file, rules);
    if (message) {
      setErrors((current) => ({ ...current, visual: message }));
      return;
    }
    clearError("visual");
    setVisualMode(type);
    setVisualFile(file);
    setRemoveVisual(false);
  };

  const chooseVisualMode = (modeValue: VisualType | "") => {
    setVisualMode(modeValue);
    setVisualFile(null);
    clearError("visual");
    if (!modeValue) {
      setRemoveVisual(Boolean(initial?.visual));
      return;
    }
    if (initial?.visual && initial.visual.type !== modeValue) {
      setRemoveVisual(true);
    } else if (initial?.visual && initial.visual.type === modeValue) {
      setRemoveVisual(false);
    }
  };

  const checklist = useMemo(
    () => [
      { label: "标题已填写", done: title.trim().length >= 2 },
      { label: "已选择内容类型", done: Boolean(contentType) },
      { label: "已选择地区", done: Boolean(regionId) },
      { label: "内容说明已填写", done: summary.trim().length >= 1 },
      { label: "已选择录音文件", done: Boolean(audioFile || initial?.audio.url) },
      { label: "已勾选录音授权声明", done: recordingAuthorized },
    ],
    [title, contentType, regionId, summary, audioFile, initial?.audio, recordingAuthorized],
  );

  const mapServerFields = (fields?: Record<string, string>) => {
    const mapped: FormErrors = {};
    if (!fields) return mapped;
    for (const [key, value] of Object.entries(fields)) {
      if (key.startsWith("audio")) mapped.audio = mapped.audio ?? value;
      else if (key.startsWith("visual")) mapped.visual = mapped.visual ?? value;
      else if (key.startsWith("subtitleSegments")) mapped.subtitles = mapped.subtitles ?? value;
      else if (key.startsWith("submitterCredit")) mapped.creditName = mapped.creditName ?? value;
      else mapped[key] = mapped[key] ?? value;
    }
    return mapped;
  };

  const failWith = (nextErrors: FormErrors, message = "请检查表单中标红的字段") => {
    setErrors(nextErrors);
    toast(message, "error");
    window.setTimeout(() => {
      formRef.current?.querySelector<HTMLElement>(".has-error, [aria-invalid='true']")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const rows = subtitles.map((segment) => ({ start: segment.start, text: segment.text.trim() }));
    const candidate = {
      title,
      summary,
      contentType,
      languageId: languageId || null,
      regionId,
      subtitleSegments: rows.length ? rows : null,
      translationZh: translation.trim() || null,
      cultureContext: culture.trim() || null,
      submitterCredit: {
        mode: creditMode,
        name: creditMode === "nickname" ? creditName.trim() : null,
      },
      recordingAuthorized,
      audio: { path: audioFile || initial?.audio.url ? "pending" : "", durationSeconds: audioDuration },
      visual: hasVisual && visualMode ? { type: visualMode, path: "pending" } : null,
    };

    const parsed = submissionInputSchema.safeParse(candidate);
    const nextErrors: FormErrors = parsed.success ? {} : mapServerFields(flattenZodErrors(parsed.error));

    if (!audioFile && !initial?.audio.url) {
      nextErrors.audio = nextErrors.audio ?? "请上传录音文件";
    }
    if (visualMode && !hasVisual && !(visualFile || existingVisualVisible)) {
      nextErrors.visual = nextErrors.visual ?? "请选择主视觉文件";
    }
    if (Object.keys(nextErrors).length) {
      failWith(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const needUpload = Boolean(audioFile || visualFile) || mode === "create";
      let audioPath: string | undefined;
      let visualPath: string | undefined;
      let duration = audioDuration;

      if (needUpload) {
        let uploadAudio = audioFile;
        if (!uploadAudio && initial && visualFile) {
          setStageText("正在读取现有录音…");
          try {
            uploadAudio = await urlToFile(initial.audio.url, `recording-${initial.id}.wav`);
          } catch {
            setSubmitting(false);
            setStageText("");
            failWith({ audio: "无法读取现有录音，请重新选择录音文件后提交" });
            return;
          }
        }
        if (!uploadAudio) {
          setSubmitting(false);
          setStageText("");
          failWith({ audio: "请上传录音文件" });
          return;
        }

        setStageText("正在准备上传…");
        const sign = await api.post<SignResponse>("/uploads/sign", {
          audio: {
            fileName: uploadAudio.name,
            mimeType: uploadAudio.type,
            sizeBytes: uploadAudio.size,
          },
          ...(visualFile && visualMode
            ? {
                visual: {
                  type: visualMode,
                  fileName: visualFile.name,
                  mimeType: visualFile.type,
                  sizeBytes: visualFile.size,
                },
              }
            : {}),
        });

        setStageText("正在上传文件…");
        setAudioProgress(0);
        if (visualFile) setVisualProgress(0);
        const uploads: Promise<void>[] = [
          uploadToSignedUrl(sign.audio.uploadUrl, sign.audio.path, uploadAudio, setAudioProgress),
        ];
        if (visualFile && sign.visual) {
          uploads.push(
            uploadToSignedUrl(sign.visual.uploadUrl, sign.visual.path, visualFile, setVisualProgress),
          );
        }
        await Promise.all(uploads);

        audioPath = sign.audio.path;
        if (visualFile) visualPath = sign.visual?.path;
        if (audioFile) {
          const measured = await readAudioDuration(audioFile);
          duration = measured ?? audioDuration;
        }
        setStageText("正在创建投稿…");
      } else {
        setStageText("正在保存修改…");
      }

      const body: Record<string, unknown> = {
        title: title.trim(),
        summary: summary.trim(),
        contentType,
        languageId: languageId || null,
        regionId,
        subtitleSegments: rows.length ? rows : null,
        translationZh: translation.trim() || null,
        cultureContext: culture.trim() || null,
        submitterCredit: {
          mode: creditMode,
          name: creditMode === "nickname" ? creditName.trim() : null,
        },
        recordingAuthorized: true,
      };
      if (audioPath) body.audio = { path: audioPath, durationSeconds: duration };
      if (visualPath && visualMode) body.visual = { type: visualMode, path: visualPath };
      else if (!visualFile && removeVisual && !visualMode) body.visual = null;
      else if (mode === "edit" && !visualFile && visualMode && initial?.visual && removeVisual) {
        body.visual = null;
      }

      if (mode === "create") {
        await api.post<{ id: string }>("/submissions", body);
        toast("投稿已提交，等待审核", "success");
        router.push("/my-submissions");
      } else if (initial) {
        await api.patch<{ id: string }>(`/submissions/${initial.id}`, body);
        toast("修改已重新提交，等待审核", "success");
        router.push(`/my-submissions/${initial.id}`);
      }
      router.refresh();
    } catch (error) {
      setSubmitting(false);
      setStageText("");
      setAudioProgress(undefined);
      setVisualProgress(undefined);
      if (error instanceof ApiError) {
        const mapped = mapServerFields(error.fields);
        if (error.code === "FILE_TOO_LARGE") {
          mapped.audio = mapped.audio ?? error.message;
        }
        setErrors(mapped);
        toast(error.message, "error");
      } else {
        toast(errorMessage(error), "error");
      }
    }
  };

  if (optionsLoading) {
    return (
      <div className="form-options-loading">
        <LoadingBlock label="正在加载投稿选项" lines={3} />
      </div>
    );
  }

  if (optionsError) {
    return (
      <ErrorState
        title="投稿选项加载失败"
        description="请检查网络后重试"
        onRetry={() => setOptionsAttempt((value) => value + 1)}
      />
    );
  }

  return (
    <form ref={formRef} className="submission-form" onSubmit={handleSubmit} noValidate>
      <div className="form-layout">
        <div className="form-main">
          <section className="form-section">
            <header className="form-section-head">
              <span className="form-step">01</span>
              <div>
                <h2>基本信息</h2>
                <p>这些是让访客认识这件收藏品的核心信息。</p>
              </div>
            </header>

            <label className={`field ${errors.title ? "has-error" : ""}`} htmlFor="title">
              <span className="field-label">收藏品标题 <em>必填</em></span>
              <input
                id="title"
                className="input input-lg"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  clearError("title");
                }}
                maxLength={80}
                placeholder="例如：阿婆讲端午"
                aria-invalid={Boolean(errors.title)}
              />
              <span className="field-foot">
                {errors.title ? <span className="field-error">{errors.title}</span> : <span className="field-hint">2–80 字，简明描述这段内容</span>}
                <span className="char-count">{title.length}/80</span>
              </span>
            </label>

            <div className={`field ${errors.contentType ? "has-error" : ""}`}>
              <span className="field-label">内容类型 <em>必填</em></span>
              <div className="type-options" role="radiogroup" aria-label="内容类型">
                {CONTENT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`type-option ${contentType === type.value ? "is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="contentType"
                      value={type.value}
                      checked={contentType === type.value}
                      onChange={() => {
                        setContentType(type.value);
                        clearError("contentType");
                      }}
                    />
                    <span className="type-option-label">{type.label}</span>
                    <span className="type-option-note">{type.note}</span>
                  </label>
                ))}
              </div>
              {errors.contentType ? <span className="field-error">{errors.contentType}</span> : null}
            </div>

            <div className="form-grid-2">
              <label className={`field ${errors.languageId ? "has-error" : ""}`} htmlFor="language">
                <span className="field-label">方言 / 语言 <em>必填</em></span>
                <span className="select-wrap select-wrap-block">
                  <select
                    id="language"
                    className="select"
                    value={languageId}
                    onChange={(event) => {
                      setLanguageId(event.target.value);
                      clearError("languageId");
                    }}
                  >
                    <option value="">暂不确定</option>
                    {languages.map((language) => (
                      <option key={language.id} value={language.id}>{language.name}</option>
                    ))}
                  </select>
                  <Icon name="chevron-down" size={14} className="select-chevron" />
                </span>
                <span className="field-hint">不确定时可选择「暂不确定」</span>
                {errors.languageId ? <span className="field-error">{errors.languageId}</span> : null}
              </label>

              <label className={`field ${errors.regionId ? "has-error" : ""}`} htmlFor="region">
                <span className="field-label">地区 <em>必填</em></span>
                <span className="select-wrap select-wrap-block">
                  <select
                    id="region"
                    className="select"
                    value={regionId}
                    onChange={(event) => {
                      setRegionId(event.target.value);
                      clearError("regionId");
                    }}
                  >
                    <option value="">请选择省级地区</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>{region.name}</option>
                    ))}
                  </select>
                  <Icon name="chevron-down" size={14} className="select-chevron" />
                </span>
                <span className="field-hint">公开展示只到省级，不采集精确位置</span>
                {errors.regionId ? <span className="field-error">{errors.regionId}</span> : null}
              </label>
            </div>

            <label className={`field ${errors.summary ? "has-error" : ""}`} htmlFor="summary">
              <span className="field-label">内容说明 <em>必填</em></span>
              <textarea
                id="summary"
                className="textarea"
                rows={4}
                value={summary}
                onChange={(event) => {
                  setSummary(event.target.value);
                  clearError("summary");
                }}
                maxLength={2000}
                placeholder="这段录音说了什么？发生在什么场景？例如：阿婆在灶前教孙女包粽子，讲到小时候看龙舟的事。"
                aria-invalid={Boolean(errors.summary)}
              />
              <span className="field-foot">
                {errors.summary ? <span className="field-error">{errors.summary}</span> : <span className="field-hint">1–2000 字</span>}
                <span className="char-count">{summary.length}/2000</span>
              </span>
            </label>
          </section>

          <section className="form-section">
            <header className="form-section-head">
              <span className="form-step">02</span>
              <div>
                <h2>声音与授权</h2>
                <p>真实录音是收藏品的核心。请确认你有权公开这段声音。</p>
              </div>
            </header>

            <UploadField
              label="录音文件"
              hint={FILE_RULES.audio.hint}
              accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav,audio/x-m4a"
              required
              file={audioFile}
              progress={audioProgress}
              error={errors.audio}
              disabled={submitting}
              existingUrl={initial?.audio.url}
              existingType="audio"
              onSelect={handleAudioSelect}
              onRemove={() => {
                setAudioFile(null);
                setAudioProgress(undefined);
              }}
            />
            {audioDuration != null ? (
              <p className="audio-duration-note">
                <Icon name="clock" size={14} />
                录音时长约 {formatDuration(audioDuration)}
              </p>
            ) : null}

            <label className={`checkbox-card ${recordingAuthorized ? "is-checked" : ""} ${errors.recordingAuthorized ? "has-error" : ""}`}>
              <input
                type="checkbox"
                checked={recordingAuthorized}
                onChange={(event) => {
                  setRecordingAuthorized(event.target.checked);
                  clearError("recordingAuthorized");
                }}
                aria-invalid={Boolean(errors.recordingAuthorized)}
              />
              <span className="checkbox-box" aria-hidden="true">
                <Icon name="check" size={13} />
              </span>
              <span className="checkbox-copy">
                <strong>{RECORDING_AUTH_TEXT}</strong>
                <span>未勾选时无法提交。平台会在公开前进行人工审核。</span>
              </span>
            </label>
            {errors.recordingAuthorized ? (
              <p className="field-error" role="alert">{errors.recordingAuthorized}</p>
            ) : null}
          </section>

          <section className="form-section">
            <header className="form-section-head">
              <span className="form-step">03</span>
              <div>
                <h2>主视觉素材 <span className="section-optional">选填</span></h2>
                <p>围绕录音故事制作的一张图片或一段短视频，用于卡片和详情页。没有也可以正常提交。</p>
              </div>
            </header>

            <div className="visual-mode-tabs" role="radiogroup" aria-label="主视觉素材">
              <button
                type="button"
                className={visualMode === "" ? "is-selected" : ""}
                onClick={() => chooseVisualMode("")}
              >
                不提供
              </button>
              <button
                type="button"
                className={visualMode === "image" ? "is-selected" : ""}
                onClick={() => chooseVisualMode("image")}
              >
                <Icon name="image" size={15} />
                图片
              </button>
              <button
                type="button"
                className={visualMode === "video" ? "is-selected" : ""}
                onClick={() => chooseVisualMode("video")}
              >
                <Icon name="film" size={15} />
                短视频
              </button>
            </div>

            {visualMode === "" ? (
              <p className="visual-skip-note">
                未提供主视觉素材时，卡片会使用文字封面，不会出现空白图片位。
              </p>
            ) : (
              <>
                <UploadField
                  label={visualMode === "image" ? "主视觉图片" : "主视觉短视频"}
                  hint={visualMode === "image" ? FILE_RULES.image.hint : FILE_RULES.video.hint}
                  accept={
                    visualMode === "image"
                      ? ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      : ".mp4,.webm,video/mp4,video/webm"
                  }
                  file={visualFile}
                  progress={visualProgress}
                  error={errors.visual}
                  disabled={submitting}
                  existingUrl={existingVisualVisible ? initial?.visual?.url : null}
                  existingType={visualMode}
                  onSelect={handleVisualSelect}
                  onRemove={() => {
                    setVisualFile(null);
                    setVisualProgress(undefined);
                    if (!(initial?.visual && initial.visual.type === visualMode)) setRemoveVisual(true);
                  }}
                  onRemoveExisting={
                    initial?.visual
                      ? () => {
                          setRemoveVisual(true);
                          setVisualMode("");
                          setVisualFile(null);
                        }
                      : undefined
                  }
                />
                {visualFile && visualPreviewUrl ? (
                  <div className="visual-preview">
                    {visualMode === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={visualPreviewUrl} alt="主视觉预览" />
                    ) : (
                      <video src={visualPreviewUrl} muted loop playsInline controls />
                    )}
                    <span className="visual-preview-label">预览 · 详情页视频将静音循环播放</span>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section className="form-section">
            <header className="form-section-head">
              <span className="form-step">04</span>
              <div>
                <h2>字幕与文字 <span className="section-optional">选填</span></h2>
                <p>有逐句字幕、普通话释义或文化背景时，可以让访客读得更明白；没有也不影响提交和发布。</p>
              </div>
            </header>

            <div className={`field ${errors.subtitles ? "has-error" : ""}`}>
              <span className="field-label">逐句字幕 <span className="tag-optional">选填</span></span>
              <SubtitleEditor segments={subtitles} onChange={setSubtitles} audioUrl={audioPreviewUrl} />
              {errors.subtitles ? <span className="field-error">{errors.subtitles}</span> : null}
            </div>

            <label className="field" htmlFor="translation">
              <span className="field-label">普通话释义 / 翻译 <span className="tag-optional">选填</span></span>
              <textarea
                id="translation"
                className="textarea"
                rows={3}
                value={translation}
                onChange={(event) => setTranslation(event.target.value)}
                maxLength={5000}
                placeholder="用普通话说明录音里的意思，不确定时可以留空。"
              />
            </label>

            <label className="field" htmlFor="culture">
              <span className="field-label">文化背景 <span className="tag-optional">选填</span></span>
              <textarea
                id="culture"
                className="textarea"
                rows={3}
                value={culture}
                onChange={(event) => setCulture(event.target.value)}
                maxLength={5000}
                placeholder="故事背景、使用场景、童谣或俗语的含义等。"
              />
            </label>
          </section>

          <section className="form-section">
            <header className="form-section-head">
              <span className="form-step">05</span>
              <div>
                <h2>署名方式 <span className="section-optional">选填</span></h2>
                <p>署名只影响公开页面展示，系统始终保留投稿账号与记录的关联。</p>
              </div>
            </header>

            <div className={`credit-options ${errors.creditName ? "has-error" : ""}`} role="radiogroup" aria-label="署名方式">
              <label className={`credit-option ${creditMode === "anonymous" ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name="credit"
                  checked={creditMode === "anonymous"}
                  onChange={() => {
                    setCreditMode("anonymous");
                    clearError("creditName");
                  }}
                />
                <span>
                  <strong>匿名展示</strong>
                  <small>公开页面不显示账号或昵称</small>
                </span>
              </label>
              <label className={`credit-option ${creditMode === "nickname" ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name="credit"
                  checked={creditMode === "nickname"}
                  onChange={() => {
                    setCreditMode("nickname");
                  }}
                />
                <span>
                  <strong>昵称展示</strong>
                  <small>在详情页标注你的公开署名</small>
                </span>
              </label>
            </div>

            {creditMode === "nickname" ? (
              <label className={`field ${errors.creditName ? "has-error" : ""}`} htmlFor="creditName">
                <span className="field-label">公开署名 <em>必填</em></span>
                <input
                  id="creditName"
                  className="input"
                  value={creditName}
                  onChange={(event) => {
                    setCreditName(event.target.value);
                    clearError("creditName");
                  }}
                  maxLength={30}
                  placeholder="例如：阿禾"
                  aria-invalid={Boolean(errors.creditName)}
                />
                {errors.creditName ? <span className="field-error">{errors.creditName}</span> : null}
              </label>
            ) : null}
          </section>
        </div>

        <aside className="form-aside">
          <div className="aside-card">
            <h3 className="aside-title">
              <Icon name="check" size={16} />
              提交前检查
            </h3>
            <ul className="checklist">
              {checklist.map((item) => (
                <li key={item.label} className={item.done ? "is-done" : ""}>
                  <span className="checklist-mark" aria-hidden="true">
                    <Icon name={item.done ? "check" : "close"} size={12} />
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="aside-card aside-note">
            <h3 className="aside-title">
              <Icon name="info" size={16} />
              投稿须知
            </h3>
            <ul className="plain-list">
              <li>提交后进入「待审核」，审核前不能修改内容。</li>
              <li>主视觉、字幕、释义、背景和公开署名均可留空。</li>
              <li>已发布内容不能编辑，如需修改请先撤回再重新投稿。</li>
              <li>本期不提供草稿暂存。</li>
            </ul>
          </div>

          {isMockMode ? (
            <p className="aside-mock">
              演示环境：上传的文件只保存在当前浏览器会话，刷新后示例音频将接替播放。
            </p>
          ) : null}
        </aside>
      </div>

      <div className="submit-bar">
        <div className="submit-bar-inner">
          <p className="submit-note">
            {stageText || (recordingAuthorized ? "提交后进入待审核，审核通过前不会公开展示。" : "请先勾选录音授权声明。")}
          </p>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!recordingAuthorized || submitting}
          >
            {submitting ? (
              <>
                <span className="spinner spinner-light" aria-hidden="true" />
                {stageText || "提交中…"}
              </>
            ) : (
              <>
                <Icon name="arrow-up-right" size={18} />
                {mode === "create" ? "提交投稿" : "修改并重新提交"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}