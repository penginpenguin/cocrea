import { icon } from "./Project.svg";

(function (Scratch) {
    Scratch.translate.setup({
        zh: {
            'Project0832.Project0832': '项目',
            'Project0832.description': '在Gandi中读取项目信息',
            'Project0832.TotalUsedBlocks': '使用的块总数',
            'Project0832.NumberOfBlockTypes': '块种类数',
            'Project0832.NumberOfSegments': '段数',
            'Project0832.NumberOfCostumes': '造型数',
            'Project0832.NumberOfSounds': '声音数'
        },
        en: {
            'Project0832.Project0832': 'Project',
            'Project0832.description': 'Read Project information in Gandi',
            'Project0832.TotalUsedBlocks': 'Total Used Blocks',
            'Project0832.NumberOfBlockTypes': 'Number Of Block Types',
            'Project0832.NumberOfSegments': 'Number Of Segments',
            'Project0832.NumberOfCostumes': 'Number Of Costumes',
            'Project0832.NumberOfSounds': 'Number Of Sounds'
        }
    });

    const extensionId = 'Project0832';

    class Project {
        constructor(runtime) {
            this.runtime = runtime;
            this.totalUsedBlocks = 0;
            this.numberOfBlockTypes = 0;
            this.numberOfSegments = 0;
            this.numberOfCostumes = 0;
            this.numberOfSounds = 0;
        }

        calculate() {
            const targets = this.runtime.targets;
            const blocksUsed = {};
            let segmentCount = 0;
            let costumeCount = 0;
            let soundCount = 0;

            for (let i = 0; i < targets.length; i++) {
                const target = targets[i];
                if (target.blocks) {
                    for (const blockId in target.blocks._blocks) {
                        const block = target.blocks._blocks[blockId];
                        const blockType = block.opcode.split('_')[0];
                        blocksUsed[blockType] = (blocksUsed[blockType] || 0) + 1;
                        if (block.topLevel && block.parent === null) segmentCount++;
                    }
                }
                if (target.sprite.costumes) costumeCount += target.sprite.costumes.length;
                if (target.sprite.sounds) soundCount += target.sprite.sounds.length;
            }

            this.totalUsedBlocks = targets.reduce((acc, target) => acc + Object.keys(target.blocks._blocks || {}).length, 0);
            this.numberOfBlockTypes = Object.keys(blocksUsed).length;
            this.numberOfSegments = segmentCount;
            this.numberOfCostumes = costumeCount;
            this.numberOfSounds = soundCount;
        }

        getInfo() {
            return {
                id: extensionId,
                name: Scratch.translate({ id: 'Project0832.Project0832', default: 'Project' }),
                blocks: [
                    {
                        opcode: 'TotalUsedBlocks',
                        blockType: Scratch.BlockType.REPORTER,
                        disableMonitor: true,
                        text: Scratch.translate({ id: 'Project0832.TotalUsedBlocks', default: 'Total Used Blocks' })
                    },
                    {
                        opcode: 'NumberOfBlockTypes',
                        blockType: Scratch.BlockType.REPORTER,
                        disableMonitor: true,
                        text: Scratch.translate({ id: 'Project0832.NumberOfBlockTypes', default: 'Number of Block Types' })
                    },
                    {
                        opcode: 'NumberOfSegments',
                        blockType: Scratch.BlockType.REPORTER,
                        disableMonitor: true,
                        text: Scratch.translate({ id: 'Project0832.NumberOfSegments', default: 'Number of Segments' })
                    },
                    {
                        opcode: 'NumberOfCostumes',
                        blockType: Scratch.BlockType.REPORTER,
                        disableMonitor: true,
                        text: Scratch.translate({ id: 'Project0832.NumberOfCostumes', default: 'Number of Costumes' })
                    },
                    {
                        opcode: 'NumberOfSounds',
                        blockType: Scratch.BlockType.REPORTER,
                        disableMonitor: true,
                        text: Scratch.translate({ id: 'Project0832.NumberOfSounds', default: 'Number of Sounds' })
                    },
                    {
                        opcode: 'TextToBinary',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'text [TEXT] to binary [SPACED]?',
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello' },
                            SPACED: { type: Scratch.ArgumentType.BOOLEAN, defaultValue: true }
                        }
                    },
                    {
                        opcode: 'BinaryToText',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'binary [BINARY] to text [SPACED]?',
                        arguments: {
                            BINARY: { type: Scratch.ArgumentType.STRING, defaultValue: '01001000 01101001' },
                            SPACED: { type: Scratch.ArgumentType.BOOLEAN, defaultValue: true }
                        }
                    }
                ]
            };
        }

        TotalUsedBlocks() { this.calculate(); return this.totalUsedBlocks; }
        NumberOfBlockTypes() { this.calculate(); return this.numberOfBlockTypes; }
        NumberOfSegments() { this.calculate(); return this.numberOfSegments; }
        NumberOfCostumes() { this.calculate(); return this.numberOfCostumes; }
        NumberOfSounds() { this.calculate(); return this.numberOfSounds; }

        TextToBinary(args) {
            const text = args.TEXT || '';
            const spaced = args.SPACED;
            const binaryArray = [...text].map(char =>
                char.charCodeAt(0).toString(2).padStart(8, '0')
            );
            return spaced ? binaryArray.join(' ') : binaryArray.join('');
        }

        BinaryToText(args) {
            const spaced = args.SPACED;
            const chunks = spaced
                ? args.BINARY.trim().split(/\s+/)
                : (args.BINARY.match(/.{1,8}/g) || []);
            return chunks.map(bin => String.fromCharCode(parseInt(bin, 2))).join('');
        }
    }

    const extension = {
        Extension: Project,
        info: {
            name: `${extensionId}.Project0832.Project0832`,
            description: `${extensionId}.Project0832.description`,
            extensionId,
            iconURL: icon,
            featured: true,
            disabled: false,
            collaboratorList: [
                { collaborator: "0832", collaboratorURL: "https://github.com/0832k12" }
            ]
        },
        l10n: {
            "zh-cn": {
                [`${extensionId}.Project0832.Project0832`]: "项目",
                [`${extensionId}.Project0832.description`]: "在Gandi中读取项目信息",
            },
            en: {
                [`${extensionId}.Project0832.Project0832`]: "Project",
                [`${extensionId}.Project0832.description`]: "Read Project information in Gandi",
            }
        }
    };

    window.tempExt = extension;
})(Scratch);
