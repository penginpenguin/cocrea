(function (Scratch) {
    class TextToBinaryExtension {
        getInfo() {
            return {
                id: 'texttobinary',
                name: 'Text to Binary',
                blocks: [
                    {
                        opcode: 'textToBinary',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'convert text [TEXT] to binary [DEBUG]',
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Hello'
                            },
                            DEBUG: {
                                type: Scratch.ArgumentType.BOOLEAN,
                                defaultValue: false
                            }
                        }
                    },
                    {
                        opcode: 'binaryToText',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'convert binary [BINARY] to text [DEBUG]',
                        arguments: {
                            BINARY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '01001000 01101001'
                            },
                            DEBUG: {
                                type: Scratch.ArgumentType.BOOLEAN,
                                defaultValue: false
                            }
                        }
                    }
                ]
            };
        }

        textToBinary(args) {
            const text = args.TEXT || '';
            const debug = args.DEBUG;

            let binary = text
                .split('')
                .map(char => {
                    const bin = char.charCodeAt(0).toString(2).padStart(8, '0');
                    return bin;
                })
                .join(' ');

            if (debug) {
                binary = `[DEBUG] Input: "${text}" ➝ Binary: "${binary}"`;
            }

            return binary;
        }

        binaryToText(args) {
            const binary = args.BINARY || '';
            const debug = args.DEBUG;

            try {
                const text = binary
                    .split(' ')
                    .map(bin => String.fromCharCode(parseInt(bin, 2)))
                    .join('');

                if (debug) {
                    return `[DEBUG] Input: "${binary}" ➝ Text: "${text}"`;
                }

                return text;
            } catch (e) {
                return '[ERROR] Invalid binary input.';
            }
        }
    }

    Scratch.extensions.register(new TextToBinaryExtension());
})(Scratch);
