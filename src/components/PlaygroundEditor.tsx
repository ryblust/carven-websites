import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { isolateHistory } from '@codemirror/commands';
import { Annotation, Prec } from '@codemirror/state';
import { sourceEditorState } from '../playground/editor';
import { translate, type Locale } from '../lib/i18n';
import { diagnosticSelection, type DiagnosticLocation } from '../playground/diagnostics';

const externalSource = Annotation.define<boolean>();

export interface PlaygroundEditorHandle {
  reveal: (location: DiagnosticLocation) => boolean;
}

export default function PlaygroundEditor({
  source,
  locale,
  onChange,
  onRun,
  ref,
}: {
  source: string;
  locale: Locale;
  onChange: (source: string) => void;
  onRun: () => void;
  ref?: Ref<PlaygroundEditorHandle>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const current = useRef({ source, onChange, onRun });
  useLayoutEffect(() => {
    current.current = { source, onChange, onRun };
  });

  useImperativeHandle(
    ref,
    () => ({
      reveal(location) {
        const instance = view.current;
        if (!instance) return false;
        if (instance.state.doc.toString() !== current.current.source.replace(/\r\n?/g, '\n')) {
          return false;
        }
        const selection = diagnosticSelection(current.current.source, location);
        if (!selection || selection.head > instance.state.doc.length) return false;
        instance.dispatch({
          selection,
          effects: EditorView.scrollIntoView(selection.anchor, { y: 'center' }),
        });
        instance.focus();
        return true;
      },
    }),
    [],
  );

  useEffect(() => {
    if (!host.current) return;
    const t = translate(locale);
    const instance = new EditorView({
      parent: host.current,
      state: sourceEditorState(current.current.source, [
        EditorView.contentAttributes.of({
          id: 'playground-source',
          'aria-label': t('main.cv 源码编辑器', 'main.cv source editor'),
          'aria-describedby': 'playground-editor-help',
          spellcheck: 'false',
          autocapitalize: 'off',
          autocorrect: 'off',
        }),
        Prec.highest(
          keymap.of([
            {
              key: 'Mod-Enter',
              run: () => {
                current.current.onRun();
                return true;
              },
            },
          ]),
        ),
        EditorView.updateListener.of((update) => {
          if (
            update.transactions.some(
              (transaction) => transaction.docChanged && !transaction.annotation(externalSource),
            )
          )
            current.current.onChange(update.state.doc.toString());
        }),
      ]),
    });
    view.current = instance;
    return () => {
      instance.destroy();
      view.current = null;
    };
  }, [locale]);

  useEffect(() => {
    const instance = view.current;
    if (instance && instance.state.doc.toString() !== source) {
      // An explicit reset is an undoable edit. Ordinary typing already lives in
      // CodeMirror's state and must not replace the document or its history.
      instance.dispatch({
        changes: { from: 0, to: instance.state.doc.length, insert: source },
        selection: { anchor: 0 },
        scrollIntoView: true,
        annotations: [isolateHistory.of('full'), externalSource.of(true)],
      });
    }
  }, [source]);

  return <div ref={host} className="playground-code-editor" />;
}
