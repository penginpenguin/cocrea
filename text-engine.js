(function (Scratch) {
    class TextEngine {
        constructor() {
            this.fontPrefix = ''; // e.g., "bold-"
            this.spacing = 20;
            this.clones = [];
        }

        getInfo() {
            return {
                id: 'textrenderer',
                name: 'Text Renderer',
                blocks: [
                    {
                        opcode: 'setFontPrefix',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set font prefix to [PREFIX]',
                        arguments: {
                            PREFIX: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: ''
                            }
                        }
                    },
                    {
                        opcode: 'renderText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'render text [TEXT] with spacing [SPACING]',
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'HELLO'
                            },
                            SPACING: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 20
                            }
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

        renderText(args, util) {
            const text = args.TEXT || '';
            const spacing = Number(args.SPACING || 20);
            const baseSprite = util.target;

            // Clear existing clones
            this.clearClones();

            for (let i = 0; i < text.length; i++) {
                const char = text[i].toUpperCase();
                const costumeName = `${this.fontPrefix}${char}`;
                const clone = baseSprite.makeClone();
                if (clone) {
                    this.clones.push(clone);
                    // Delay so the clone is initialized
                    setTimeout(() => {
                        if (clone.setCostume) {
                            clone.setCostume(costumeName);
                        }
                        clone.setXY(baseSprite.x + i * spacing, baseSprite.y);
                    }, 50 * i); // Spread out so it doesn't break
                }
            }
        }

        clearText(args, util) {
            this.clearClones();
        }

        clearClones() {
            this.clones.forEach(clone => {
                if (clone && clone.deleteThisClone) {
                    clone.deleteThisClone();
                }
            });
            this.clones = [];
        }
    }

    Scratch.extensions.register(new TextEngine());
})(Scratch);
