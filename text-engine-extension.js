(function (Scratch) {
    class TextEngineFixed {
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
                id: 'textrendererfixed',
                name: 'Text Engine Fixed',
                blocks: [
                    {
                        opcode: 'setFontSettings',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set font to sprite [SPRITE] prefix [PREFIX] spacing [SPACING] line spacing [LINESPACING]',
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
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello World!' },
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
                    spriteMenu: 'getSpriteNames'
                }
            };
        }

        getSpriteNames() {
            return this.runtime.targets
                .filter(t => t.isOriginal && t.sprite)
                .map(t => ({
                    text: t.sprite.name,
                    value: t.sprite.name
                }));
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
            const startX = Number(args.X || 0);
            const startY = Number(args.Y || 0);
            const lines = text.split('\n');

            const fontSpriteTarget = this.runtime.targets.find(t =>
                t.sprite?.name === this.fontSpriteName && t.isOriginal
            );

            if (!fontSpriteTarget) {
                console.warn('[TextEngine] Font sprite not found:', this.fontSpriteName);
                return;
            }

            this.clearText();

            let clones = [];

            let index = 0;
            for (let row = 0; row < lines.length; row++) {
                const line = lines[row];
                for (let col = 0; col < line.length; col++) {
                    const char = line[col];
                    const costumeName = this.fontPrefix + char;

                    // create clone
                    const clone = fontSpriteTarget.makeClone();
                    if (clone) {
                        clones.push(clone);

                        ((clone, costumeName, x, y) => {
                            setTimeout(() => {
                                if (clone.setCostume) clone.setCostume(costumeName);
                                if (clone.setXY) clone.setXY(x, y);
                            }, 50 * index);
                        })(
                            clone,
                            costumeName,
                            startX + col * this.spacing,
                            startY - row * this.lineSpacing
                        );

                        index++;
                    }
                }
            }

            this.lastClones = clones;
        }
    }

    Scratch.extensions.register(new TextEngineFixed());
})(Scratch);
