import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Brush, Eraser, Redo2, Square, Undo2 } from 'lucide-react';
import { DEFAULT_THEME, type TLTheme } from '@tldraw/editor';
import {
  DefaultColorStyle,
  DefaultFillStyle,
  type Editor,
  GeoShapeGeoStyle,
  Tldraw,
  track,
  type TLDefaultColorStyle,
  type TLGeoShape,
} from 'tldraw';
import 'tldraw/tldraw.css';

import './PaintEditor.css';

type PaletteColorName = TLDefaultColorStyle | `paint-${string}`;

type PaletteColor = {
  name: PaletteColorName;
  label: string;
  hex: string;
};

type SwatchStyle = CSSProperties & {
  '--swatch-color': string;
};

const palette: PaletteColor[] = [
  { name: 'black', label: 'Black', hex: '#111827' },
  { name: 'grey', label: 'Grey', hex: '#6b7280' },
  { name: 'paint-slate', label: 'Slate', hex: '#334155' },
  { name: 'red', label: 'Red', hex: '#dc2626' },
  { name: 'light-red', label: 'Light red', hex: '#f87171' },
  { name: 'paint-rose', label: 'Rose', hex: '#e11d48' },
  { name: 'paint-pink', label: 'Pink', hex: '#ec4899' },
  { name: 'orange', label: 'Orange', hex: '#ea580c' },
  { name: 'paint-amber', label: 'Amber', hex: '#f59e0b' },
  { name: 'yellow', label: 'Yellow', hex: '#facc15' },
  { name: 'paint-lime', label: 'Lime', hex: '#84cc16' },
  { name: 'green', label: 'Green', hex: '#16a34a' },
  { name: 'light-green', label: 'Light green', hex: '#4ade80' },
  { name: 'paint-emerald', label: 'Emerald', hex: '#059669' },
  { name: 'paint-teal', label: 'Teal', hex: '#0d9488' },
  { name: 'paint-cyan', label: 'Cyan', hex: '#06b6d4' },
  { name: 'paint-sky', label: 'Sky', hex: '#0ea5e9' },
  { name: 'blue', label: 'Blue', hex: '#2563eb' },
  { name: 'light-blue', label: 'Light blue', hex: '#60a5fa' },
  { name: 'paint-indigo', label: 'Indigo', hex: '#4f46e5' },
  { name: 'violet', label: 'Violet', hex: '#7c3aed' },
  { name: 'light-violet', label: 'Light violet', hex: '#c084fc' },
  { name: 'paint-purple', label: 'Purple', hex: '#9333ea' },
  { name: 'paint-fuchsia', label: 'Fuchsia', hex: '#c026d3' },
];

const toTldrawColor = (color: PaletteColorName) => color as TLDefaultColorStyle;

const createThemeColor = (hex: string) => ({
  solid: hex,
  fill: hex,
  linedFill: hex,
  frameHeadingStroke: hex,
  frameHeadingFill: '#ffffff',
  frameStroke: hex,
  frameFill: '#ffffff',
  frameText: '#111827',
  noteFill: hex,
  noteText: '#111827',
  semi: hex,
  pattern: hex,
  highlightSrgb: hex,
  highlightP3: hex,
});

const createPaintTheme = (): TLTheme => {
  const theme = structuredClone(DEFAULT_THEME);

  for (const mode of ['light', 'dark'] as const) {
    const colors = theme.colors[mode] as Record<string, string | ReturnType<typeof createThemeColor>>;

    for (const { hex, name } of palette) {
      colors[name] = createThemeColor(hex);
    }
  }

  return theme;
};

const paintTheme = createPaintTheme();
const paintThemes = { default: paintTheme };

type PaintEditorProps = {
  onEditorReady: (editor: Editor) => void;
};

export function PaintEditor({ onEditorReady }: PaintEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  const handleMount = useCallback(
    (mountedEditor: Editor) => {
      setEditor(mountedEditor);
      onEditorReady(mountedEditor);

      return () => {
        setEditor(null);
      };
    },
    [onEditorReady],
  );

  return (
    <section className="paint-editor" aria-label="Paint editor">
      <Tldraw hideUi onMount={handleMount} themes={paintThemes} />
      {editor ? <PaintControls editor={editor} /> : null}
    </section>
  );
}

type PaintControlsProps = {
  editor: Editor;
};

const PaintControls = track(({ editor }: PaintControlsProps) => {
  const currentTool = editor.getCurrentToolId();
  const canUndo = editor.getCanUndo();
  const canRedo = editor.getCanRedo();
  const currentColor =
    editor.getSharedStyles().getAsKnownValue(DefaultColorStyle) ??
    editor.getStyleForNextShape(DefaultColorStyle);

  useEffect(() => {
    editor.updateInstanceState({ isToolLocked: true });
    editor.setCurrentTool('draw');
    editor.setStyleForNextShapes(GeoShapeGeoStyle, 'rectangle');
    editor.setStyleForNextShapes(DefaultFillStyle, 'fill');
    editor.setStyleForNextShapes(DefaultColorStyle, 'black');
  }, [editor]);

  useEffect(() => {
    const fillSquareShape = (shape: TLGeoShape): TLGeoShape => {
      const color = editor.getStyleForNextShape(DefaultColorStyle);

      if (shape.props.fill === 'fill' && shape.props.color === color) {
        return shape;
      }

      return {
        ...shape,
        props: {
          ...shape.props,
          color,
          fill: 'fill',
        },
      };
    };

    const cleanupCreate = editor.sideEffects.registerBeforeCreateHandler(
      'shape',
      (shape) => (shape.type === 'geo' ? fillSquareShape(shape) : shape),
    );

    const cleanupChange = editor.sideEffects.registerBeforeChangeHandler(
      'shape',
      (_, next) => (next.type === 'geo' ? fillSquareShape(next) : next),
    );

    return () => {
      cleanupCreate();
      cleanupChange();
    };
  }, [editor]);

  const selectDrawTool = () => {
    editor.run(() => {
      editor.selectNone();
      editor.updateInstanceState({ isToolLocked: true });
      editor.setCurrentTool('draw');
    });
  };

  const selectSquareTool = () => {
    editor.run(() => {
      editor.selectNone();
      editor.updateInstanceState({ isToolLocked: true, isChangingStyle: true });
      editor.setStyleForNextShapes(GeoShapeGeoStyle, 'rectangle');
      editor.setStyleForNextShapes(DefaultFillStyle, 'fill');
      editor.setCurrentTool('geo');
    });
  };

  const selectEraserTool = () => {
    editor.run(() => {
      editor.selectNone();
      editor.updateInstanceState({ isToolLocked: true });
      editor.setCurrentTool('eraser');
    });
  };

  const undo = () => {
    editor.undo();
  };

  const redo = () => {
    editor.redo();
  };

  const setColor = (color: PaletteColorName) => {
    const tldrawColor = toTldrawColor(color);

    editor.setStyleForSelectedShapes(DefaultColorStyle, tldrawColor);
    editor.setStyleForNextShapes(DefaultColorStyle, tldrawColor);
  };

  return (
    <div className="paint-controls" aria-label="Drawing controls">
      <div className="paint-action-list" aria-label="History controls">
        <button
          aria-label="Undo"
          className="paint-icon-button"
          disabled={!canUndo}
          onClick={undo}
          title="Undo"
          type="button"
        >
          <Undo2 aria-hidden="true" size={20} strokeWidth={2.25} />
        </button>
        <button
          aria-label="Redo"
          className="paint-icon-button"
          disabled={!canRedo}
          onClick={redo}
          title="Redo"
          type="button"
        >
          <Redo2 aria-hidden="true" size={20} strokeWidth={2.25} />
        </button>
      </div>
      <div className="paint-tool-list" aria-label="Tool picker">
        <button
          aria-label="Brush tool"
          className="paint-icon-button"
          data-active={currentTool === 'draw'}
          onClick={selectDrawTool}
          title="Brush"
          type="button"
        >
          <Brush aria-hidden="true" size={20} strokeWidth={2.25} />
        </button>
        <button
          aria-label="Square tool"
          className="paint-icon-button"
          data-active={currentTool === 'geo'}
          onClick={selectSquareTool}
          title="Square"
          type="button"
        >
          <Square aria-hidden="true" size={20} strokeWidth={2.25} />
        </button>
        <button
          aria-label="Eraser tool"
          className="paint-icon-button"
          data-active={currentTool === 'eraser'}
          onClick={selectEraserTool}
          title="Eraser"
          type="button"
        >
          <Eraser aria-hidden="true" size={20} strokeWidth={2.25} />
        </button>
      </div>
      <div className="paint-palette" aria-label="Color palette">
        {palette.map((color) => (
          <button
            aria-label={`${color.label} brush`}
            className="paint-swatch"
            data-active={currentColor === color.name}
            key={color.name}
            onClick={() => setColor(color.name)}
            style={{ '--swatch-color': color.hex } as SwatchStyle}
            title={color.label}
            type="button"
          />
        ))}
      </div>
    </div>
  );
});
