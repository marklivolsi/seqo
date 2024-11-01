# seqo

[![Tests](https://github.com/marklivolsi/seqo/workflows/Test/badge.svg)](https://github.com/marklivolsi/seqo/actions/workflows/test.yml)
[![npm version](https://badge.fury.io/js/seqo.svg)](https://badge.fury.io/js/seqo)

A JavaScript adaptation of the Python library [clique](https://gitlab.com/4degrees/clique) for parsing collections from common numerical components. Useful for handling frame sequences, version numbers, and other numbered file patterns.

## Features

- Detect and group numbered sequences from file lists
- Parse sequence patterns with variable padding
- Handle frame ranges with gaps and discontinuities
- Format sequences with customizable patterns
- Support for contiguous and non-contiguous sequences

## Installation

```bash
npm install seqo
```

## Usage

### Basic Sequence Detection
The `Collection.assemble` static method accepts a list of strings and returns a tuple containing an array of collections and an array of unmatched items (remainder):

```javascript
import { Collection } from 'seqo';

const files = [
    'shot_001.exr',
    'shot_002.exr',
    'shot_003.exr',
    'other.txt'
];

const [collections, remainder] = Collection.assemble(files);

collections[0].members // ['shot_001.exr', 'shot_002.exr', 'shot_003.exr']
remainder // ['other.txt']
```

### Creating Collections
Collections can be manually instantiated by providing an object containing the `head` (prefix), `tail` (suffix), `padding`, and `indexes` properties:
```javascript
import { Collection } from 'seqo';

const collection = new Collection({
    head: 'frame_',    // prefix
    tail: '.exr',      // suffix
    padding: 4,        // leading-0 pad length
    indexes: [1, 2, 3] // indexes
});

collection.members  // ['frame_0001.exr', 'frame_0002.exr', 'frame_0003.exr']
```

### Working with Ranges
The `Collection` object provides methods to analyze and manipulate discontinuous ranges:

```javascript
const collection = new Collection({
    head: 'v',
    indexes: [1, 2, 4, 5, 7]
});

// Check for gaps
collection.isContiguous  // false

// Get missing indexes
collection.holes.indexes  // [3, 6]

// Split into contiguous parts
const parts = collection.separate();
// parts[0].indexes => [1, 2]
// parts[1].indexes => [4, 5]
// parts[2].indexes => [7]
```

Seqo also provides a `range` utility function for generating integer ranges, similar to Python's `range` function:
```javascript
import { range } from 'seqo';

// Basic range with stop value
[...range(5)]               // [0, 1, 2, 3, 4]

// Range with start and stop
[...range(2, 5)]           // [2, 3, 4]

// Range with start, stop, and step
[...range(0, 10, 2)]       // [0, 2, 4, 6, 8]

// Negative step for descending ranges
[...range(5, 0, -1)]       // [5, 4, 3, 2, 1]

// Creating a collection using range
const collection = new Collection({
    head: 'frame_',
    tail: '.exr',
    padding: 4,
    indexes: [...range(1, 6)]  // [1, 2, 3, 4, 5]
});
collection.members
// ['frame_0001.exr', 'frame_0002.exr', 'frame_0003.exr', 'frame_0004.exr', 'frame_0005.exr']
```

### Pattern Parsing

The `Collection.parse` static method creates `Collection` objects from formatted strings. It supports both default and custom patterns for parsing collection specifications.

```javascript
import { Collection } from 'seqo';

// Using default pattern: '{head}{padding}{tail} [{ranges}]'
const collection = Collection.parse('frame_%04d.exr [1-5]');
collection.members
// ['frame_0001.exr', 'frame_0002.exr', 'frame_0003.exr', 'frame_0004.exr', 'frame_0005.exr']

// Using custom pattern
const customPattern = 'Sequence ({head}) padding:{padding} has frames {ranges}';
const collection2 = Collection.parse(
    'Sequence (render_) padding:%03d has frames 1-3, 5-6',
    { pattern: customPattern }
);
collection2.members
// ['render_001', 'render_002', 'render_003', 'render_005', 'render_006']

// Pattern with excluded ranges using holes
const patternWithHoles = '{head}{padding}{tail} [{range}] [{holes}]'
const collection3 = Collection.parse('shot_%03d.exr [1-10] [4-6]',
    {pattern: patternWithHoles}
);
collection3.members
// ['shot_001.exr', 'shot_002.exr', 'shot_003.exr', 
//  'shot_007.exr', 'shot_008.exr', 'shot_009.exr', 'shot_010.exr']

// Pattern supporting multiple range groups
const collection4 = Collection.parse('v%02d.ma [1-3, 7-8, 10]');
collection4.members
// ['v01.ma', 'v02.ma', 'v03.ma', 'v07.ma', 'v08.ma', 'v10.ma']
```

Pattern placeholders:
- `{head}`: The prefix before each index
- `{padding}`: The padding pattern (e.g., %02d)
- `{tail}`: The suffix after each index
- `{range}`: The full index range from start-end (inclusive)
- `{ranges}`: A comma-separated list of index ranges
- `{holes}`: The index ranges to exclude (optional)

Both ranges and holes support:
- Single numbers: `1`
- Ranges: `1-5`
- Multiple groups: `1-3, 7-8, 10`

### Modifying Collections

Collections can be modified by adding or removing items. Items can be numbers, formatted strings, or other compatible collections. Collections are considered compatible when they share the same head, tail, and padding values.

```javascript
// Create an initial collection
const collection = new Collection({
    head: 'shot_',
    tail: '.exr',
    padding: 3
});

// Adding different types of items
collection.add(1);                // adds shot_001.exr
collection.add('shot_002.exr');   // adds shot_002.exr
collection.add([3, 4, 5]);        // adds multiple indexes at once
collection.members
// ['shot_001.exr', 'shot_002.exr', 'shot_003.exr', 'shot_004.exr', 'shot_005.exr']

// Adding another collection
const otherCollection = new Collection({
    head: 'shot_',
    tail: '.exr',
    padding: 3,
    indexes: [6, 7, 8]
});

collection.add(otherCollection);
collection.members
// ['shot_001.exr', 'shot_002.exr', 'shot_003.exr', 'shot_004.exr', 
//  'shot_005.exr', 'shot_006.exr', 'shot_007.exr', 'shot_008.exr']

// Removing items
collection.remove(1);              // removes shot_001.exr
collection.remove('shot_002.exr'); // removes shot_002.exr
collection.remove([3, 4]);         // removes multiple indexes
collection.members
// ['shot_005.exr', 'shot_006.exr', 'shot_007.exr', 'shot_008.exr']

// Removing another collection
collection.remove(otherCollection);
collection.members
// ['shot_005.exr']

// Error handling with strict mode
collection.remove('invalid.exr', { strict: true });
// Error: "Invalid string format: invalid.exr"

// Collections must be compatible to add/remove
const incompatibleCollection = new Collection({
    head: 'different_',  // different prefix
    tail: '.exr',
    padding: 3,
    indexes: [1, 2]
});

// Check compatibility
collection.isCompatible(incompatibleCollection);
// false

collection.add(incompatibleCollection);
// Error: "[object Collection] is not compatible with this collection."
```

### Formatting Collections
Use the `format` method to generate a string representation of a `Collection`:
```javascript
const collection = new Collection({
    head: 'frame_',
    tail: '.exr',
    padding: 4,
    indexes: [1, 2, 3, 5, 6, 7, 10]
});

// Default format: '{head}{padding}{tail} [{ranges}]'
collection.format()  // 'frame_%04d.exr [1-3, 5-7, 10]'

// Custom format
collection.format('{head} has {holes} missing')  // 'frame_ has 4, 8-9 missing'
```

## Built-in Patterns

Seqo includes common sequence patterns through `Collection.patterns`:

```javascript
import { Collection } from 'seqo';

// Match frame numbers: ".001.", ".0001."
Collection.patterns.frames    // '\\.\\d+\\.'

// Match version numbers: "v001", "v1"
Collection.patterns.versions  // 'v\\d+'

// Generic digit sequence: "001", "1"
Collection.patterns.digits    // '\\d+'
```

## License

Copyright (c) 2024 Mark Livolsi

Derived from [clique](https://gitlab.com/4degrees/clique) Copyright (c) 2013 Martin Pengelly-Phillips

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.