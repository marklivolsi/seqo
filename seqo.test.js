import { Collection } from "./seqo.js";


describe("Collection", () => {

    test('constructor creates a Collection instance', () => {
        const collection = new Collection('file', '.txt', 3, [1, 2, 3], ['file001.txt', 'file002.txt', 'file003.txt']);
        expect(collection).toBeInstanceOf(Collection);
        expect(collection.head).toBe('file');
        expect(collection.tail).toBe('.txt');
        expect(collection.padding).toBe(3);
        expect(collection.indexes).toEqual([1, 2, 3]);
        expect(collection.members).toEqual(['file001.txt', 'file002.txt', 'file003.txt']);
    });

});


describe('Collection.match', () => {
    test('matches a simple pattern', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 2, 3], ['file_01.txt', 'file_02.txt', 'file_03.txt']);
        expect(collection.match('file_01.txt')).not.toBeNull();
        expect(collection.match('file_02.txt')).not.toBeNull();
        expect(collection.match('file_03.txt')).not.toBeNull();
    });

    test('does not match items outside the pattern', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 2, 3], ['file_01.txt', 'file_02.txt', 'file_03.txt']);
        expect(collection.match('file_04.txt')).not.toBeNull();
        expect(collection.match('other_01.txt')).toBeNull();
        expect(collection.match('file_01.jpg')).toBeNull();
    });

    test('respects padding', () => {
        const collection = new Collection('img_', '.png', 3, [1, 2, 3], ['img_001.png', 'img_002.png', 'img_003.png']);
        expect(collection.match('img_001.png')).not.toBeNull();
        expect(collection.match('img_01.png')).toBeNull();
    });

    test('handles zero padding correctly', () => {
        const collection = new Collection('v', '', 0, [1, 2, 3], ['v1', 'v2', 'v3']);
        expect(collection.match('v1')).not.toBeNull();
        expect(collection.match('v01')).toBeNull();
    });

    test('matches at start and end of string', () => {
        const collection = new Collection('', '_end', 2, [1, 2, 3], ['01_end', '02_end', '03_end']);
        expect(collection.match('01_end')).not.toBeNull();
        expect(collection.match('1_end')).toBeNull();
    });

    test('handles complex patterns', () => {
        const collection = new Collection('frame_', '_v2.exr', 4, [1, 2, 3], ['frame_0001_v2.exr', 'frame_0002_v2.exr', 'frame_0003_v2.exr']);
        expect(collection.match('frame_0001_v2.exr')).not.toBeNull();
        expect(collection.match('frame_1_v2.exr')).toBeNull();
        expect(collection.match('frame_0001_v1.exr')).toBeNull();
    });

    test('returns correct match object', () => {
        const collection = new Collection('seq_', '.jpg', 3, [1, 2, 3], ['seq_001.jpg', 'seq_002.jpg', 'seq_003.jpg']);
        const match = collection.match('seq_002.jpg');
        expect(match).not.toBeNull();
        expect(match.groups.index).toBe('002');
        expect(match.groups.padding).toBe('00');
    });
});


describe('Collection.add', () => {
    test('adds a new item to the collection', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 2], ['file_01.txt', 'file_02.txt']);
        collection.add('file_03.txt');
        expect(collection.indexes).toEqual([1, 2, 3]);
        expect(collection.members).toContain('file_03.txt');
    });

    test('does not add duplicate items', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 2], ['file_01.txt', 'file_02.txt']);
        collection.add('file_02.txt');
        expect(collection.indexes).toEqual([1, 2]);
        expect(collection.members).toEqual(['file_01.txt', 'file_02.txt']);
    });

    test('throws an error when adding an item that does not match the pattern', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 2], ['file_01.txt', 'file_02.txt']);
        expect(() => collection.add('file_03.jpg')).toThrow("Item 'file_03.jpg' does not match collection expression.");
    });

    test('adds item with different padding when padding is 0', () => {
        const collection = new Collection('v', '', 0, [1, 2], ['v1', 'v2']);
        collection.add('v10');
        console.log(collection.members);
        console.log(collection.indexes);
        expect(collection.indexes).toEqual([1, 2, 10]);
        expect(collection.members).toContain('v10');
    });

    test('throws an error when adding item with incorrect padding', () => {
        const collection = new Collection('img_', '.png', 3, [1, 2], ['img_001.png', 'img_002.png']);
        expect(() => collection.add('img_03.png')).toThrow("Item 'img_03.png' does not match collection expression.");
    });

    test('maintains sorted order of indexes and members after adding', () => {
        const collection = new Collection('seq_', '.jpg', 3, [1, 3], ['seq_001.jpg', 'seq_003.jpg']);
        collection.add('seq_002.jpg');
        expect(collection.indexes).toEqual([1, 2, 3]);
        expect(collection.members).toEqual(['seq_001.jpg', 'seq_002.jpg', 'seq_003.jpg']);
    });

    test('adds item with non-consecutive index', () => {
        const collection = new Collection('frame_', '.exr', 4, [1, 2, 3], ['frame_0001.exr', 'frame_0002.exr', 'frame_0003.exr']);
        collection.add('frame_0010.exr');
        expect(collection.indexes).toEqual([1, 2, 3, 10]);
        expect(collection.members).toContain('frame_0010.exr');
    });
});