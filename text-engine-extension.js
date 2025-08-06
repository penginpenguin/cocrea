(function (Scratch) {
    class TextEngine {
        constructor(runtime) {
            this.runtime = runtime;
            this.fontPrefix = '';
            this.fontSpriteName = null;
            this.spacing = 20;
            this.lineSpacing = 30;
            this.lastClones = [];
        }

        getInfo() {
            return {
                id: 'textrendererplus',
                name: 'Text Engine+',
                blocks: [
                    {
                        opcode: 'setFontPrefix',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set font prefix to [PREFIX]',
                        arguments: {
                            PREFIX: { type: Scratch.ArgumentType.STRING, defaultValue: '' }
                        }
                    },
                    {
                        opcode: 'setFontSprite',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set font sprite to [SPRITE]',
                        arguments: {
                            SPRITE: { type: Scratch.ArgumentType.STRING, defaultValue: 'FontSprite' }
                        }
                    },
                    {
                        opcode: 'renderText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'render text [TEXT] at x [X] y [Y] with spacing [SPACING] line spacing [LINESPACING]',
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello\nWorld!' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            SPACING: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 },
                            LINESPACING: { type: Scratch.ArgumentType.NUMBER, defaultValue: 30 }
                        }
                    },
                    {
                        opcode: 'clearText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'clear text'
                    }
                ]
            };
        }

        setFontPrefix(args) {
            this.fontPrefix = args.PREFIX || '';
        }

        setFontSprite(args) {
            this.fontSpriteName = args.SPRITE;
        }

        clearText() {
            for (const target of this.lastClones) {
                if (target && target.isOriginal === false && this.runtime.targets.includes(target)) {
                    target.deleteThisClone();
                }
            }
            this.lastClones = [];
        }

        renderText(args, util) {
            const text = args.TEXT || '';
            const spacing = Number(args.SPACING || 20);
            const lineSpacing = Number(args.LINESPACING || 30);
            const startX = Number(args.X || 0);
            const startY = Number(args.Y || 0);
            const lines = text.split('\n');

            const fontSprite = this.runtime.targets.find(t =>
                t.sprite?.name === this.fontSpriteName
            ) || util.target;

            this.clearText();

            let clones = [];

            for (let row = 0; row < lines.length; row++) {
                const line = lines[row];
                for (let col = 0; col < line.length; col++) {
                    const char = line[col];
                    const costumeName = this.fontPrefix + char;

                    const clone = fontSprite.makeClone();
                    if (clone) {
                        clones.push(clone);

                        // Delay so clone initializes
                        ((clone, x, y, costumeName) => {
                            setTimeout(() => {
                                try {
                                    if (clone.setCostume) clone.setCostume(costumeName);
                                    clone.setXY(x, y);
                                } catch (e) {
                                    // ignore missing costumes
                                }
                            }, 50 * (col + row * line.length));
                        })(clone,
                            startX + col * spacing,
                            startY - row * lineSpacing,
                            costumeName
                        );
                    }
                }
            }

            this.lastClones = clones;
        }
    }

    Scratch.extensions.register(new TextEngine());
})(Scratch);
