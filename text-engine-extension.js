(function (Scratch) {
    class TextEngineFixed {
        constructor(runtime) {
            this.runtime = runtime;
            this.fontPrefix = '';
            this.fontSpriteName = '';
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
                        opcode: 'setFontSettings',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set font: sprite [SPRITE] prefix [PREFIX] spacing [SPACING] line spacing [LINESPACING]',
                        arguments: {
                            SPRITE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'spriteMenu'
                            },
                            PREFIX: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            SPACING: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 },
                            LINESPACING: { type: Scratch.ArgumentType.NUMBER, defaultValue: 30 }
                        }
                    },
                    {
                        opcode: 'renderText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'render text [TEXT] at x [X] y [Y]',
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello\nWorld!' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'clearText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'clear text'
                    }
                ],
                menus: {
                    spriteMenu: {
                        acceptReporters: false
                    }
                }
            };
        }

        spriteMenu() {
            return this.runtime.targets
                .filter(t => t.isOriginal && t.sprite && t.sprite.name)
                .map(t => t.sprite.name);
        }

        setFontSettings(args) {
            this.fontSpriteName = args.SPRITE;
            this.fontPrefix = args.PREFIX || '';
            this.spacing = Number(args.SPACING || 20);
            this.lineSpacing = Number(args.LINESPACING || 30);
        }

        clearText() {
            for (const clone of this.lastClones) {
                if (clone && !clone.isOriginal && this.runtime.targets.includes(clone)) {
                    clone.dispose();
                }
            }
            this.lastClones = [];
        }

        renderText(args, util) {
            const text = args.TEXT || '';
            const startX = Number(args.X);
            const startY = Number(args.Y);
            const lines = text.split('\n');

            const fontSpriteTarget = this.runtime.targets.find(
                t => t.isOriginal && t.sprite && t.sprite.name === this.fontSpriteName
            );
            if (!fontSpriteTarget) return;

            this.clearText();

            const clones = [];
            let count = 0;

            for (let row = 0; row < lines.length; row++) {
                const line = lines[row];
                for (let col = 0; col < line.length; col++) {
                    const char = line[col];
                    const costumeName = this.fontPrefix + char;

                    const clone = fontSpriteTarget.makeClone();
                    if (clone) {
                        clones.push(clone);
                        ((clone, y, x, name, delay) => {
                            setTimeout(() => {
                                if (clone.setCostume) clone.setCostume(name);
                                if (clone.setXY) clone.setXY(x, y);
                            }, delay);
                        })(clone,
                           startY - row * this.lineSpacing,
                           startX + col * this.spacing,
                           costumeName,
                           count * 30
                        );
                        count++;
                    }
                }
            }

            this.lastClones = clones;
        }
    }

    Scratch.extensions.register(new TextEngineFixed());
})(Scratch);

