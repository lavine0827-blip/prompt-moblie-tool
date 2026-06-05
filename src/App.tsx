import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { buildPrompt, extractVariables, getVariableOrder, moveVariable } from "./prompt";
import { keys, readJson, writeJson } from "./storage";
import { defaultTemplates, PromptTemplate } from "./templates";
import { StoredTemplates, VariableImage } from "./types";

type ValuesByTemplate = Record<string, Record<string, string>>;
type ImagesByTemplate = Record<string, Record<string, VariableImage>>;
type OrdersByTemplate = Record<string, string[]>;

const ALL_CATEGORIES = "全部";
const READY_TEXT = "已就绪";

function normalizeTemplates(value: StoredTemplates | unknown): PromptTemplate[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && "templates" in value
      ? (value as { templates: unknown }).templates
      : [];

  if (!Array.isArray(list)) return defaultTemplates;

  const normalized = list
    .filter((item): item is PromptTemplate => {
      return Boolean(
        item &&
          typeof item === "object" &&
          "name" in item &&
          "content" in item &&
          typeof (item as PromptTemplate).name === "string" &&
          typeof (item as PromptTemplate).content === "string"
      );
    })
    .map((item, index) => ({
      id: item.id || `template-${index + 1}`,
      category: item.category || item.name || "未分类",
      name: item.name.trim() || "未命名模板",
      content: item.content
    }));

  return normalized.length ? normalized : defaultTemplates;
}

function readTemplates(): PromptTemplate[] {
  return normalizeTemplates(readJson<StoredTemplates | null>(keys.templates, null));
}

function isImageVariableName(name: string) {
  return /(图|图片|原图|产品图|参考图|替换图|软装参考图|餐桌原图|椅子图|image|photo|img|pic|鍥)/i.test(name);
}

function getTemplateSummary(template: PromptTemplate) {
  const clean = template.content.replace(/\s+/g, " ").trim();
  return clean.length > 72 ? `${clean.slice(0, 72)}...` : clean || "暂无模板说明";
}

export function App() {
  const [templates, setTemplates] = useState<PromptTemplate[]>(readTemplates);
  const [selectedId, setSelectedId] = useState(() => {
    const list = readTemplates();
    const saved = localStorage.getItem(keys.selectedTemplateId);
    return list.some((template) => template.id === saved) ? saved! : list[0]?.id || defaultTemplates[0].id;
  });
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [valuesByTemplate, setValuesByTemplate] = useState<ValuesByTemplate>(() =>
    readJson(keys.variableValues, {})
  );
  const [imagesByTemplate, setImagesByTemplate] = useState<ImagesByTemplate>(() =>
    readJson(keys.variableImages, {})
  );
  const [ordersByTemplate, setOrdersByTemplate] = useState<OrdersByTemplate>(() =>
    readJson(keys.variableOrder, {})
  );
  const [finalPrompt, setFinalPrompt] = useState(() => localStorage.getItem(keys.finalPrompt) || "");
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [draftTemplate, setDraftTemplate] = useState<PromptTemplate | null>(null);
  const [toast, setToast] = useState(READY_TEXT);
  const [draggedName, setDraggedName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ name: string; position: "before" | "after" } | null>(null);
  const outputRef = useRef<HTMLTextAreaElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  const activeTemplate = templates.find((template) => template.id === selectedId) || templates[0];
  const variables = useMemo(() => extractVariables(activeTemplate?.content || ""), [activeTemplate]);
  const orderedVariables = useMemo(
    () => getVariableOrder(ordersByTemplate[activeTemplate?.id || ""], variables),
    [activeTemplate?.id, ordersByTemplate, variables]
  );
  const currentValues = valuesByTemplate[activeTemplate?.id || ""] || {};
  const currentImages = imagesByTemplate[activeTemplate?.id || ""] || {};

  const categories = useMemo(
    () => [ALL_CATEGORIES, ...Array.from(new Set(templates.map((template) => template.category || "未分类")))],
    [templates]
  );

  const filteredTemplates = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return templates.filter((template) => {
      const text = `${template.category} ${template.name} ${template.content}`.toLowerCase();
      const categoryMatched = selectedCategory === ALL_CATEGORIES || template.category === selectedCategory;
      return categoryMatched && text.includes(keyword);
    });
  }, [query, selectedCategory, templates]);

  useEffect(() => {
    writeJson(keys.templates, templates);
  }, [templates]);

  useEffect(() => {
    localStorage.setItem(keys.selectedTemplateId, selectedId);
  }, [selectedId]);

  useEffect(() => {
    writeJson(keys.variableValues, valuesByTemplate);
  }, [valuesByTemplate]);

  useEffect(() => {
    writeJson(keys.variableOrder, ordersByTemplate);
  }, [ordersByTemplate]);

  useEffect(() => {
    try {
      writeJson(keys.variableImages, imagesByTemplate);
    } catch {
      showToast("图片预览过大，未能保存到本地缓存");
    }
  }, [imagesByTemplate]);

  useEffect(() => {
    localStorage.setItem(keys.finalPrompt, finalPrompt);
  }, [finalPrompt]);

  function showToast(message: string) {
    setToast(message);
    window.clearTimeout((showToast as unknown as { timer?: number }).timer);
    (showToast as unknown as { timer?: number }).timer = window.setTimeout(() => {
      setToast(READY_TEXT);
    }, 2200);
  }

  function selectTemplate(templateId: string) {
    setSelectedId(templateId);
    setFinalPrompt("");
    setIsEditingPrompt(false);
    showToast("已切换模板");
  }

  function updateValue(name: string, value: string) {
    setValuesByTemplate((prev) => ({
      ...prev,
      [activeTemplate.id]: {
        ...(prev[activeTemplate.id] || {}),
        [name]: value
      }
    }));
  }

  function clearValues() {
    setValuesByTemplate((prev) => ({
      ...prev,
      [activeTemplate.id]: {}
    }));
    showToast("变量已清空");
  }

  function resetOrder() {
    setOrdersByTemplate((prev) => {
      const next = { ...prev };
      delete next[activeTemplate.id];
      return next;
    });
    showToast("已恢复默认排序");
  }

  function generatePrompt() {
    if (!activeTemplate) return;
    const result = buildPrompt(activeTemplate.content, currentValues);
    setFinalPrompt(result);
    setIsEditingPrompt(false);
    showToast("提示词已生成");
  }

  async function copyPrompt() {
    if (!activeTemplate) return;

    const text = finalPrompt.trim() ? finalPrompt : buildPrompt(activeTemplate.content, currentValues);
    if (!finalPrompt.trim()) setFinalPrompt(text);

    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      showToast("已复制");
    } catch {
      setIsEditingPrompt(true);
      requestAnimationFrame(() => {
        outputRef.current?.focus();
        outputRef.current?.select();
      });
      showToast("复制失败，请手动选择文本复制");
    }
  }

  function openTemplateEditor(template = activeTemplate) {
    if (!template) return;
    setDraftTemplate({ ...template });
    setTemplateEditorOpen(true);
  }

  function saveTemplateEditor() {
    if (!draftTemplate) return;
    const template = {
      ...draftTemplate,
      name: draftTemplate.name.trim() || "未命名模板",
      category: draftTemplate.category.trim() || draftTemplate.name.trim() || "未分类"
    };
    setTemplates((prev) => {
      const exists = prev.some((item) => item.id === template.id);
      return exists ? prev.map((item) => (item.id === template.id ? template : item)) : [...prev, template];
    });
    setSelectedId(template.id);
    setTemplateEditorOpen(false);
    showToast("模板已保存");
  }

  function addTemplate() {
    const template: PromptTemplate = {
      id: `template-${Date.now()}`,
      category: "自定义模板",
      name: "新模板",
      content: "请将{原图}中的{目标主体}修改为{目标效果}。"
    };
    openTemplateEditor(template);
  }

  function deleteTemplate() {
    if (!activeTemplate) return;
    if (templates.length <= 1) {
      showToast("至少保留一个模板");
      return;
    }
    if (!window.confirm(`确定删除“${activeTemplate.name}”吗？`)) return;
    const next = templates.filter((template) => template.id !== activeTemplate.id);
    setTemplates(next);
    setSelectedId(next[0].id);
    showToast("模板已删除");
  }

  function exportTemplates() {
    const payload = {
      app: "ChatGPT 图片提示词模板生成器",
      version: 2,
      exportedAt: new Date().toISOString(),
      templates
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `图片提示词模板_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("模板已导出");
  }

  function importTemplates(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = normalizeTemplates(JSON.parse(String(reader.result || "")));
        setTemplates(imported);
        setSelectedId(imported[0].id);
        setFinalPrompt("");
        showToast("模板已导入");
      } catch {
        showToast("导入失败：JSON 格式错误");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function handleImage(name: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setImagesByTemplate((prev) => ({
        ...prev,
        [activeTemplate.id]: {
          ...(prev[activeTemplate.id] || {}),
          [name]: { name: file.name, dataUrl }
        }
      }));
      updateValue(name, file.name);
      showToast("已读取图片文件名");
    };
    reader.readAsDataURL(file);
  }

  function removeImage(name: string) {
    setImagesByTemplate((prev) => {
      const templateImages = { ...(prev[activeTemplate.id] || {}) };
      delete templateImages[name];
      return { ...prev, [activeTemplate.id]: templateImages };
    });
    updateValue(name, "");
    showToast("图片已清除");
  }

  function onDragStart(name: string, event: DragEvent<HTMLDivElement>) {
    setDraggedName(name);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", name);
  }

  function onDragOver(name: string, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setDragOver({
      name,
      position: event.clientY > rect.top + rect.height / 2 ? "after" : "before"
    });
  }

  function onDrop(name: string, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const source = draggedName || event.dataTransfer.getData("text/plain");
    const position = dragOver?.position || "before";
    const nextOrder = moveVariable(orderedVariables, source, name, position);
    setOrdersByTemplate((prev) => ({ ...prev, [activeTemplate.id]: nextOrder }));
    setDraggedName(null);
    setDragOver(null);
  }

  if (!activeTemplate) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">家具图片提示词</p>
            <h1>ChatGPT 图片提示词模板生成器</h1>
          </div>
        </header>
        <main className="app-main">
          <section className="panel empty-state">暂无模板，请先导入 JSON 模板。</section>
        </main>
      </div>
    );
  }

  const outputHtml = finalPrompt || "生成后的提示词会显示在这里。";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">家具图片提示词</p>
          <h1>ChatGPT 图片提示词模板生成器</h1>
        </div>
        <span className="status-pill">{toast}</span>
      </header>

      <main className="app-main">
        <section className="panel template-panel">
          <div className="panel-head">
            <div>
              <h2>选择模板</h2>
              <p>{templates.length} 个模板</p>
            </div>
            <button className="ghost-btn" onClick={addTemplate}>新增</button>
          </div>
          <input
            className="search-input"
            value={query}
            placeholder="搜索模板、变量或场景"
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="category-tabs" aria-label="模板分类">
            {categories.map((category) => (
              <button
                className={`category-pill ${category === selectedCategory ? "active" : ""}`}
                key={category}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="template-list">
            {filteredTemplates.map((template) => {
              const templateVariables = extractVariables(template.content);
              const imageSlotCount = templateVariables.filter(isImageVariableName).length;

              return (
                <button
                  key={template.id}
                  className={`template-card ${template.id === activeTemplate.id ? "active" : ""}`}
                  onClick={() => selectTemplate(template.id)}
                >
                  <span className="template-category">{template.category}</span>
                  <strong>{template.name}</strong>
                  <span className="template-summary">{getTemplateSummary(template)}</span>
                  <small>{templateVariables.length} 个变量 / {imageSlotCount} 个图片槽位</small>
                </button>
              );
            })}
            {!filteredTemplates.length && <div className="empty-state">没有找到匹配模板。</div>}
          </div>
        </section>

        <section className="panel active-panel">
          <div className="panel-head">
            <div>
              <h2>{activeTemplate.name}</h2>
              <p>共 {variables.length} 个变量</p>
            </div>
            <div className="inline-actions">
              <button className="ghost-btn" onClick={() => openTemplateEditor()}>编辑</button>
              <button className="ghost-btn danger-text" onClick={deleteTemplate}>删除</button>
            </div>
          </div>
          <details className="template-preview">
            <summary>查看模板正文</summary>
            <HighlightedText text={activeTemplate.content} tone="blue" />
          </details>
        </section>

        <section className="panel variables-panel">
          <div className="panel-head sticky-head">
            <div>
              <h2>变量填写</h2>
              <p>共 {orderedVariables.length} 个变量，拖拽卡片可调整填写顺序</p>
            </div>
            <div className="inline-actions">
              <button className="ghost-btn" onClick={resetOrder}>默认排序</button>
              <button className="ghost-btn" onClick={clearValues}>清空</button>
            </div>
          </div>

          {orderedVariables.length === 0 ? (
            <div className="empty-state">当前模板没有变量，可直接生成提示词。</div>
          ) : (
            <div className="variable-grid">
              {orderedVariables.map((name) => {
                const isImage = isImageVariableName(name);

                return (
                  <div
                    className={`variable-card ${
                      draggedName === name ? "dragging" : ""
                    } ${
                      dragOver?.name === name ? `drag-${dragOver.position}` : ""
                    }`}
                    data-var-name={name}
                    draggable
                    key={name}
                    onDragStart={(event) => onDragStart(name, event)}
                    onDragOver={(event) => onDragOver(name, event)}
                    onDragLeave={() => setDragOver(null)}
                    onDragEnd={() => {
                      setDraggedName(null);
                      setDragOver(null);
                    }}
                    onDrop={(event) => onDrop(name, event)}
                  >
                    <div className="variable-card-head">
                      <span className="drag-handle">☰</span>
                      <strong>{name}</strong>
                      <span className="token">{`{${name}}`}</span>
                    </div>
                    <textarea
                      value={currentValues[name] || ""}
                      placeholder={`填写 ${name}`}
                      onChange={(event) => updateValue(name, event.target.value)}
                    />
                    {isImage && (
                      <div className="image-row">
                        <label className="upload-btn">
                          选择图片
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => handleImage(name, event)}
                          />
                        </label>
                        <button className="ghost-btn" onClick={() => removeImage(name)}>清除</button>
                      </div>
                    )}
                    {isImage && currentImages[name] && (
                      <figure className="image-preview">
                        <img src={currentImages[name].dataUrl} alt={currentImages[name].name} />
                        <figcaption>{currentImages[name].name}</figcaption>
                      </figure>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel result-panel">
          <div className="panel-head">
            <div>
              <h2>最终提示词</h2>
              <p>复制时为纯文本，保留花括号</p>
            </div>
            <button className="ghost-btn" onClick={() => setIsEditingPrompt((value) => !value)}>
              {isEditingPrompt ? "预览" : "编辑"}
            </button>
          </div>
          {isEditingPrompt ? (
            <textarea
              ref={outputRef}
              className="output-editor"
              value={finalPrompt}
              onChange={(event) => setFinalPrompt(event.target.value)}
            />
          ) : (
            <div className="output-preview">
              <HighlightedText text={outputHtml} tone="orange" />
            </div>
          )}
        </section>

        <section className="panel data-panel">
          <div className="panel-head">
            <div>
              <h2>模板备份</h2>
              <p>JSON 导入导出，适合跨设备迁移</p>
            </div>
          </div>
          <div className="backup-actions">
            <button className="ghost-btn" onClick={exportTemplates}>导出 JSON</button>
            <button className="ghost-btn" onClick={() => importRef.current?.click()}>导入 JSON</button>
            <input
              ref={importRef}
              className="hidden-file"
              type="file"
              accept="application/json,.json"
              onChange={importTemplates}
            />
          </div>
        </section>
      </main>

      <nav className="bottom-bar">
        <button onClick={generatePrompt}>生成提示词</button>
        <button className="copy-btn" onClick={copyPrompt}>复制提示词</button>
      </nav>

      {templateEditorOpen && draftTemplate && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="panel-head">
              <div>
                <h2>编辑模板</h2>
                <p>变量格式保持为 {`{变量名}`}</p>
              </div>
              <button className="ghost-btn" onClick={() => setTemplateEditorOpen(false)}>关闭</button>
            </div>
            <label>
              分类
              <input
                value={draftTemplate.category}
                onChange={(event) => setDraftTemplate({ ...draftTemplate, category: event.target.value })}
              />
            </label>
            <label>
              模板名称
              <input
                value={draftTemplate.name}
                onChange={(event) => setDraftTemplate({ ...draftTemplate, name: event.target.value })}
              />
            </label>
            <label>
              模板正文
              <textarea
                className="template-editor"
                value={draftTemplate.content}
                onChange={(event) => setDraftTemplate({ ...draftTemplate, content: event.target.value })}
              />
            </label>
            <button onClick={saveTemplateEditor}>保存模板</button>
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightedText({ text, tone }: { text: string; tone: "blue" | "orange" }) {
  const parts = text.split(/(\{[^{}]+\})/g);

  return (
    <div className="highlighted-text">
      {parts.map((part, index) =>
        /^\{[^{}]+\}$/.test(part) ? (
          <span className={`highlight-token ${tone}`} key={`${part}-${index}`}>{part}</span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </div>
  );
}
