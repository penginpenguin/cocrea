(function (Scratch) {
    class TextEngine {
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
                id: 'textengine',
                name: 'Text Engine',
                blocks: [
                    {
                        opcode: 'setFont',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set font sprite [SPRITE] prefix [PREFIX] spacing [SPACING] line spacing [LINESPACING]',
                        arguments: {
                            SPRITE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'spriteMenu'
                            },
                            PREFIX: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: ''
                            },
                            SPACING: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 20
                            },
                            LINESPACING: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 30
                            }
                        }
                    },
                    {
                        opcode: 'renderText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'render text [TEXT] at x [X] y [Y]',
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Hello, world!'
                            },
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            }
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
