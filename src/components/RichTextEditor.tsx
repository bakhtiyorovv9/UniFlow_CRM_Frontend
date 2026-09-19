'use client';

import Divider from '@mui/material/Divider';
import MuiButton from '@mui/material/Button';
import MuiIconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import MuiTextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
  Unlink,
  type LucideIcon,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/messages';

type Tool = {
  label: MessageKey;
  icon: LucideIcon;
  run: (editor: Editor) => void;
  active: (editor: Editor) => boolean;
};

const GROUPS: Tool[][] = [
  [
    { label: 'editor.heading1', icon: Heading1, run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), active: (e) => e.isActive('heading', { level: 1 }) },
    { label: 'editor.heading2', icon: Heading2, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive('heading', { level: 2 }) },
  ],
  [
    { label: 'editor.bold', icon: Bold, run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive('bold') },
    { label: 'editor.italic', icon: Italic, run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive('italic') },
    { label: 'editor.underline', icon: Underline, run: (e) => e.chain().focus().toggleUnderline().run(), active: (e) => e.isActive('underline') },
    { label: 'editor.strike', icon: Strikethrough, run: (e) => e.chain().focus().toggleStrike().run(), active: (e) => e.isActive('strike') },
    { label: 'editor.quote', icon: Quote, run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive('blockquote') },
    { label: 'editor.code', icon: Code, run: (e) => e.chain().focus().toggleCode().run(), active: (e) => e.isActive('code') },
  ],
  [
    { label: 'editor.bulletList', icon: List, run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive('bulletList') },
    { label: 'editor.orderedList', icon: ListOrdered, run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive('orderedList') },
    { label: 'editor.alignLeft', icon: AlignLeft, run: (e) => e.chain().focus().setTextAlign('left').run(), active: (e) => e.isActive({ textAlign: 'left' }) },
    { label: 'editor.alignCenter', icon: AlignCenter, run: (e) => e.chain().focus().setTextAlign('center').run(), active: (e) => e.isActive({ textAlign: 'center' }) },
  ],
];

function ToolButton({ label, icon: Icon, pressed, onClick }: { label: string; icon: LucideIcon; pressed: boolean; onClick: () => void }) {
  return (
    <Tooltip title={label}>
      <MuiIconButton
        size="small"
        aria-label={label}
        aria-pressed={pressed}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        sx={pressed ? { color: 'primary.main', bgcolor: 'action.selected' } : undefined}
      >
        <Icon className="size-4" aria-hidden />
      </MuiIconButton>
    </Tooltip>
  );
}

function LinkButton({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [url, setUrl] = useState('');
  const active = editor.isActive('link');

  function apply(event: FormEvent) {
    event.preventDefault();
    const value = url.trim();
    if (!value) editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else {
      const href = /^(https?:|mailto:)/i.test(value) ? value : `https://${value}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setAnchor(null);
  }

  return (
    <>
      <ToolButton
        label={t('editor.link')}
        icon={Link}
        pressed={active}
        onClick={() => {
          setUrl((editor.getAttributes('link').href as string | undefined) ?? '');
          setAnchor(document.activeElement as HTMLElement);
        }}
      />
      {active && (
        <ToolButton label={t('editor.linkRemove')} icon={Unlink} pressed={false} onClick={() => editor.chain().focus().unsetLink().run()} />
      )}
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <form onSubmit={apply} className="flex items-center gap-2 p-3">
          <MuiTextField
            size="small"
            autoFocus
            placeholder={t('editor.linkPlaceholder')}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': t('editor.link') } }}
          />
          <MuiButton type="submit" variant="contained" size="small">
            {t('editor.linkApply')}
          </MuiButton>
        </form>
      </Popover>
    </>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  label,
  error,
  id,
}: {
  value: string;
  onChange: (html: string, text: string) => void;
  placeholder: string;
  label: string;
  error?: boolean;
  id?: string;
}) {
  const { t } = useI18n();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'rich-content min-h-40 px-4 py-3 outline-none',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        ...(id && { id }),
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? '' : current.getHTML(), current.getText().trim()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current ? GROUPS.map((group) => group.map((tool) => tool.active(current))) : null,
  });

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-surface transition-colors focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20 ${
        error ? 'border-danger' : 'border-border'
      }`}
    >
      <div role="toolbar" aria-label={t('editor.toolbar')} className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
        {editor &&
          GROUPS.map((group, groupIndex) => (
            <div key={groupIndex} className="flex items-center gap-0.5">
              {groupIndex > 0 && <Divider orientation="vertical" flexItem sx={{ mx: 0.75 }} />}
              {group.map((tool, toolIndex) => (
                <ToolButton
                  key={tool.label}
                  label={t(tool.label)}
                  icon={tool.icon}
                  pressed={Boolean(state?.[groupIndex][toolIndex])}
                  onClick={() => tool.run(editor)}
                />
              ))}
              {groupIndex === GROUPS.length - 1 && <LinkButton editor={editor} />}
            </div>
          ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
