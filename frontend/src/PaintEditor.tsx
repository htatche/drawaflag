import { useEffect, type CSSProperties } from 'react';
import { Brush, Eraser, Redo2, Square, Undo2 } from 'lucide-react';
import {
  DefaultColorStyle,
  DefaultFillStyle,
  GeoShapeGeoStyle,
  Tldraw,
  track,
  useEditor,
  type TLDefaultColorStyle,
  type TLGeoShape,
} from 'tldraw';
import 'tldraw/tldraw.css';

import './PaintEditor.css';

type PaletteColor = {
  name: TLDefaultColorStyle;
  hex: string;
};

type SwatchStyle = CSSProperties & {
  '--swatch-color': string;
};

const palette: PaletteColor[] = [
  { name: 'black', hex: '#111827' },
  { name: 'red', hex: '#dc2626' },
  { name: 'orange', hex: '#ea580c' },
  { name: 'yellow', hex: '#facc15' },
  { name: 'green', hex: '#16a34a' },
  { name: 'blue', hex: '#2563eb' },
  { name: 'violet', hex: '#7c3aed' },
  { name: 'grey', hex: '#6b7280' },
];

export function PaintEditor() {
  return (
    <section className="paint-editor" aria-label="Paint editor">
      <Tldraw hideUi>
        <PaintControls />
      </Tldraw>
    </section>
  );
}

const PaintControls = track(() => {
  const editor = useEditor();
  const currentTool = editor.getCurrentToolId();
  const canUndo = editor.getCanUndo();
  const canRedo = editor.getCanRedo();
  const currentColor =
    editor.getSharedStyles().getAsKnownValue(DefaultColorStyle) ??
    editor.getStyleForNextShape(DefaultColorStyle);

  useEffect(() => {
    const theme = structuredClone(editor.getTheme('default') ?? editor.getCurrentTheme());

    for (const mode of ['light', 'dark'] as const) {
      for (const { name } of palette) {
        const color = theme.colors[mode][name];

        if (typeof color !== 'string') {
          color.semi = color.solid;
        }
      }
    }

    editor.updateTheme(theme);
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

  const setColor = (color: TLDefaultColorStyle) => {
    editor.setStyleForSelectedShapes(DefaultColorStyle, color);
    editor.setStyleForNextShapes(DefaultColorStyle, color);
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
            aria-label={`${color.name} brush`}
            className="paint-swatch"
            data-active={currentColor === color.name}
            key={color.name}
            onClick={() => setColor(color.name)}
            style={{ '--swatch-color': color.hex } as SwatchStyle}
            title={color.name}
            type="button"
          />
        ))}
      </div>
    </div>
  );
});
