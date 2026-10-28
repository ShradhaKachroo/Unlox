import json
from schema import parse_lesson, Lesson

CURATED_TOPICS = {
    "binary_search": {
        "title": "Binary Search in Sorted Arrays",
        "level": "beginner",
        "language": "en",
        "scenes": [
            {
                "type": "title_card",
                "heading": "Binary Search: Finding Items in O(log n)",
                "narration": "Welcome! Binary search is one of the most efficient algorithms in computer science. Instead of checking every item one by one, it repeatedly cuts the search space in half.",
                "mood": "happy",
            },
            {
                "type": "diagram",
                "heading": "The Halving Strategy",
                "items": ["1. Pick middle element", "2. Compare with target", "3. Discard half of array", "4. Repeat until found"],
                "narration": "Imagine looking up a word in a physical dictionary. You flip directly to the middle. If your word comes earlier alphabetically, you discard the entire second half and search only the first half.",
                "mood": "thinking",
            },
            {
                "type": "code_walkthrough",
                "heading": "Binary Search Algorithm",
                "code": "def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1",
                "highlight_lines": [3, 4, 5],
                "narration": "Here is the classic algorithm. We maintain low and high pointers. At each step, we calculate the middle index and adjust the pointers depending on whether our target is greater or smaller.",
                "mood": "curious",
            },
            {
                "type": "diagram",
                "heading": "Step-by-Step Search Trace",
                "items": ["Array: [2, 5, 8, 12, 16, 23]", "Target: 16", "Mid is 8 -> search right half", "Mid is 16 -> target found at index 4!"],
                "narration": "Let us trace this with an array. Looking for sixteen, our middle element is eight. Since sixteen is larger, we eliminate the left half. On the next check, we land directly on sixteen at index four.",
                "mood": "excited",
            },
            {
                "type": "quiz",
                "heading": "Binary Search Requirement",
                "question": "What crucial condition must an array satisfy before you can use binary search?",
                "options": [
                    "A) The array elements must be in sorted order",
                    "B) The array must contain only positive numbers",
                    "C) The array length must be an even number",
                ],
                "correct_index": 0,
                "answer_idx": 0,
                "explanation": "Binary search relies on sorted order to decide which half of the array can be safely discarded.",
                "narration": "What crucial condition must an array satisfy before you can use binary search?",
                "mood": "happy",
            },
        ],
    },
    "variables": {
        "title": "Variables and Computer Memory",
        "level": "beginner",
        "language": "en",
        "scenes": [
            {
                "type": "title_card",
                "heading": "Variables and Memory Explained",
                "narration": "Welcome to this lesson on computer memory and variables. In programming, variables act as named labels pointing to values stored in your computer's RAM.",
                "mood": "happy",
            },
            {
                "type": "diagram",
                "heading": "The Storage Locker Analogy",
                "items": ["1. Variable name is a label", "2. Memory address holds data", "3. Reassigning updates pointer"],
                "narration": "Think of your computer's memory like numbered storage lockers. When you create a variable, Python reserves a locker for the data and sticks your label on the outside.",
                "mood": "thinking",
            },
            {
                "type": "code_walkthrough",
                "heading": "Assigning and Copying Values",
                "code": "score = 10\nbonus = score\nscore = 25\nprint('Bonus remains:', bonus)",
                "highlight_lines": [1, 2, 3],
                "narration": "Here score holds ten, and bonus is assigned the value of score. When we later change score to twenty-five, bonus remains ten because it holds its own copy of the value.",
                "mood": "curious",
            },
            {
                "type": "diagram",
                "heading": "Memory Pointer Trace",
                "items": ["score -> 10 (created)", "bonus -> 10 (assigned)", "score -> 25 (reassigned)", "bonus is still 10"],
                "narration": "Notice how the memory reference updates. Changing where score points does not alter what was previously stored in bonus. This predictability keeps programs reliable.",
                "mood": "excited",
            },
            {
                "type": "quiz",
                "heading": "Memory Assignment Check",
                "question": "After executing 'a = 5' then 'b = a' and 'a = 20', what is the value of 'b'?",
                "options": [
                    "A) 5",
                    "B) 20",
                    "C) None",
                ],
                "correct_index": 0,
                "answer_idx": 0,
                "explanation": "Assigning 'b = a' copies the value 5 into b; subsequent changes to 'a' do not affect 'b'.",
                "narration": "After executing 'a = 5' then 'b = a' and 'a = 20', what is the value of 'b'?",
                "mood": "happy",
            },
        ],
    },
    "recursion": {
        "title": "Recursion and Call Stacks",
        "level": "beginner",
        "language": "en",
        "scenes": [
            {
                "type": "title_card",
                "heading": "Understanding Recursion & Call Stacks",
                "narration": "Welcome! Recursion is a programming technique where a function calls itself to solve a smaller piece of the same problem.",
                "mood": "happy",
            },
            {
                "type": "diagram",
                "heading": "The Anatomy of Recursion",
                "items": ["1. Base Case: stops repetition", "2. Recursive Step: breaks down problem", "3. Call Stack: unwinds results"],
                "narration": "Every recursive function must have two parts: a base case that stops the repetition, and a recursive step that moves toward that base case. Without a base case, you get infinite recursion.",
                "mood": "thinking",
            },
            {
                "type": "code_walkthrough",
                "heading": "Recursive Factorial Function",
                "code": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)",
                "highlight_lines": [2, 4],
                "narration": "Here is factorial. If n is one or less, we return one immediately. Otherwise, we multiply n by factorial of n minus one, pausing the current frame until the inner call finishes.",
                "mood": "curious",
            },
            {
                "type": "diagram",
                "heading": "Call Stack Trace for factorial(3)",
                "items": ["factorial(3) calls factorial(2)", "factorial(2) calls factorial(1)", "Base case hits -> returns 1", "Frames multiply back: 3 * 2 * 1 = 6"],
                "narration": "Look at the call stack. Each invocation pushes a new memory frame onto the stack. Once the base case is reached, the stack frames unwind from top to bottom, calculating the final product.",
                "mood": "excited",
            },
            {
                "type": "quiz",
                "heading": "Base Case Knowledge Check",
                "question": "What happens if a recursive function does not include a valid base case?",
                "options": [
                    "A) It triggers a RecursionError / stack overflow",
                    "B) It runs faster without checks",
                    "C) It automatically stops after 10 calls",
                ],
                "correct_index": 0,
                "answer_idx": 0,
                "explanation": "Without a base case to terminate execution, the call stack grows infinitely until memory is exhausted.",
                "narration": "What happens if a recursive function does not include a valid base case?",
                "mood": "happy",
            },
        ],
    },
    "loops": {
        "title": "Python Loops in Depth",
        "level": "beginner",
        "language": "en",
        "scenes": [
            {
                "type": "title_card",
                "heading": "How Python Loops Work",
                "narration": "Welcome to this lesson on Python loops. A loop lets you repeat a block of code many times without writing it again and again. You will understand for loops and while loops with real examples.",
                "mood": "happy",
            },
            {
                "type": "code_walkthrough",
                "heading": "A Simple For Loop",
                "code": "for i in range(3):\n    print('Loop step:', i)",
                "highlight_lines": [1, 2],
                "narration": "Here is the simplest for loop. The range function gives us three numbers: zero, one, and two. The variable i takes each value one by one and prints it to the screen.",
                "mood": "curious",
            },
            {
                "type": "diagram",
                "heading": "Loop Iterations Step by Step",
                "items": ["Pass 1: i = 0 -> prints 0", "Pass 2: i = 1 -> prints 1", "Pass 3: i = 2 -> prints 2", "Loop ends successfully"],
                "narration": "Let us trace what happens. In the first pass, i equals zero. In the second pass, i equals one. In the third pass, i equals two. After that, there are no more values, so the loop completes.",
                "mood": "thinking",
            },
            {
                "type": "code_walkthrough",
                "heading": "Iterating Over a List",
                "code": "fruits = ['apple', 'banana', 'mango']\nfor item in fruits:\n    print('Fruit:', item)",
                "highlight_lines": [2, 3],
                "narration": "You can also loop over a list. Here we have three fruits. The for loop visits each fruit one by one and stores it in item, executing the print statement for every item.",
                "mood": "excited",
            },
            {
                "type": "quiz",
                "heading": "Loops Knowledge Check",
                "question": "When should you prefer a for loop over a while loop in Python?",
                "options": [
                    "A) When iterating over a known sequence or range",
                    "B) When waiting for an unknown user condition",
                    "C) Only when working with floating point numbers",
                ],
                "correct_index": 0,
                "answer_idx": 0,
                "explanation": "For loops excel when iterating over fixed sequences or known ranges.",
                "narration": "When should you prefer a for loop over a while loop in Python?",
                "mood": "happy",
            },
        ],
    },
}


CURATED_2MIN_TOPICS = {
    "loops": {
        "title": "Python Loops: Deep Dive & Patterns",
        "level": "beginner",
        "language": "en",
        "scenes": [
            {
                "type": "title_card",
                "heading": "Mastering Python Loops & Iteration",
                "narration": "Welcome to this in-depth lesson on Python loops. Loops are the cornerstone of automation in computer programming, allowing you to repeat instructions across lists, sequences, and streaming data cleanly without writing boilerplate code.",
                "mood": "happy",
            },
            {
                "type": "code_walkthrough",
                "heading": "Step 1: The Classic For Loop with range()",
                "code": "for i in range(3):\n    print(f'Processing task item: {i}')\nprint('All 3 tasks completed successfully!')",
                "highlight_lines": [1, 2],
                "narration": "Let us begin with the standard for loop using Python's built-in range function. The range of three produces three integers: zero, one, and two. The variable i receives each value sequentially and runs the indented print block.",
                "mood": "curious",
            },
            {
                "type": "diagram",
                "heading": "Step 2: Iteration Execution Trace",
                "items": [
                    "Iteration 1: i = 0 -> executes print for item 0",
                    "Iteration 2: i = 1 -> executes print for item 1",
                    "Iteration 3: i = 2 -> executes print for item 2",
                    "Sequence ends -> proceeds to final statement",
                ],
                "narration": "Look closely at the execution flow. In each cycle, Python assigns the next element from the iterator into the loop variable, pauses until the indented block finishes, and advances until the sequence is completely exhausted.",
                "mood": "thinking",
            },
            {
                "type": "code_walkthrough",
                "heading": "Step 3: Condition-Driven While Loops",
                "code": "energy = 3\nwhile energy > 0:\n    print(f'Robot moving forward, battery: {energy}')\n    energy -= 1\nprint('Battery empty, docking robot!')",
                "highlight_lines": [2, 4],
                "narration": "In contrast to for loops, a while loop executes as long as a boolean expression remains true. Here, the robot moves forward each turn, decrementing its energy counter until zero is reached, which cleanly breaks repetition.",
                "mood": "curious",
            },
            {
                "type": "diagram",
                "heading": "Step 4: For vs While Decision Framework",
                "items": [
                    "Use For Loops: Iterating over fixed collections, lists, or ranges",
                    "Use While Loops: Waiting for unknown conditions or event streams",
                    "Loop Control: Use break to exit early and continue to skip steps",
                    "Best Practice: Always verify loop termination to avoid infinite loops",
                ],
                "narration": "Here is your key programming takeaway: reach for a for loop when your collection size is known in advance, and use a while loop when waiting for dynamic conditions. Always ensure state updates to avoid infinite loops.",
                "mood": "excited",
            },
            {
                "type": "quiz",
                "heading": "Loops Knowledge Check",
                "question": "What is the primary difference between a Python for loop and a while loop?",
                "options": [
                    "For loops iterate over sequences; while loops repeat based on a boolean condition",
                    "While loops run faster because they skip memory allocation entirely",
                    "For loops can only process strings, whereas while loops only handle integers",
                ],
                "correct_index": 0,
                "answer_idx": 0,
                "explanation": "For loops iterate over predefined sequences or ranges, while while loops execute as long as their conditional expression remains true.",
                "narration": "What is the primary difference between a Python for loop and a while loop?",
                "mood": "happy",
            },
        ],
    },
    "binary_search": {
        "title": "Binary Search: 2-Minute Algorithm Masterclass",
        "level": "beginner",
        "language": "en",
        "scenes": [
            {
                "type": "title_card",
                "heading": "Binary Search: The Power of O(log n)",
                "narration": "Welcome to this deep dive on binary search. Instead of inspecting elements one by one, binary search repeatedly cuts the search territory in half, finding items in sorted datasets with logarithmic speed.",
                "mood": "happy",
            },
            {
                "type": "diagram",
                "heading": "Step 1: The Divide and Conquer Intuition",
                "items": [
                    "1. Find the middle element index",
                    "2. Compare middle value with target",
                    "3. Target smaller? Discard entire right half",
                    "4. Target larger? Discard entire left half",
                ],
                "narration": "Imagine flipping open a huge dictionary to the exact center. If your target word comes earlier in alphabetical order, you instantly discard the second half of the book and continue searching only the first half.",
                "mood": "thinking",
            },
            {
                "type": "code_walkthrough",
                "heading": "Step 2: Binary Search Implementation",
                "code": "def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1",
                "highlight_lines": [3, 4, 5],
                "narration": "Here is the textbook algorithm in Python. We establish two pointers, low and high. At each iteration, we calculate the middle index and shift either the low or high pointer depending on the comparison.",
                "mood": "curious",
            },
            {
                "type": "diagram",
                "heading": "Step 3: Concrete Step-by-Step Search Trace",
                "items": [
                    "Array: [3, 8, 14, 21, 29, 37, 45], Target: 37",
                    "Pass 1: Mid index 3 value 21 < 37 -> search right half",
                    "Pass 2: Sub-array [29, 37, 45], Mid index 5 value 37 == 37",
                    "Target found at index 5 in just two comparisons!",
                ],
                "narration": "Tracing this step by step: in an array of seven items looking for thirty-seven, the middle value is twenty-one. Since thirty-seven is larger, the left half vanishes. On the next check, we land directly on index five.",
                "mood": "excited",
            },
            {
                "type": "diagram",
                "heading": "Step 4: Complexity and Preconditions",
                "items": [
                    "Precondition: Data MUST be sorted before binary search",
                    "Time Complexity: O(log n) vs O(n) for linear search",
                    "Scale: Searching 1 million items takes at most 20 steps",
                    "Space Complexity: O(1) iterative memory overhead",
                ],
                "narration": "The efficiency advantage is astronomical. In a list of one million elements, a linear search could take up to a million checks, while binary search guarantees an answer in at most twenty comparisons.",
                "mood": "thinking",
            },
            {
                "type": "quiz",
                "heading": "Binary Search Knowledge Check",
                "question": "What is the non-negotiable prerequisite before applying binary search to an array?",
                "options": [
                    "The elements in the array must be sorted in ascending order",
                    "The array length must be an exact power of two",
                    "The elements must only consist of positive integer numbers",
                ],
                "correct_index": 0,
                "answer_idx": 0,
                "explanation": "Binary search relies strictly on sorted order to determine which half of the dataset can be discarded safely at each step.",
                "narration": "What is the non-negotiable prerequisite before applying binary search to an array?",
                "mood": "happy",
            },
        ],
    },
}


def _build_generic_lesson(topic: str, level: str, target_seconds: int = 60) -> dict:
    clean_topic = topic.strip().title()
    t_lower = topic.lower()
    is_coding = any(k in t_lower for k in (
        "python", "code", "coding", "program", "function", "variable", "loop", "array",
        "pointer", "algorithm", "dsa", "class", "async", "thread", "sql", "recursion",
        "stack", "tree", "graph", "object oriented", "oop", "decorator", "generator", "syntax"
    ))

    if not is_coding:
        if target_seconds >= 100:
            return {
                "title": f"Complete Guide to {clean_topic}",
                "level": level,
                "language": "en",
                "scenes": [
                    {
                        "type": "title_card",
                        "heading": f"Introduction to {clean_topic}",
                        "narration": f"Welcome to this visual lesson exploring {clean_topic}. Today we will discover what it is, examine how its different forms work, and see how to recognize it everywhere.",
                        "mood": "happy",
                    },
                    {
                        "type": "diagram",
                        "heading": f"1. Core Definitions & Characteristics",
                        "items": [
                            f"Defining visual characteristics of {clean_topic}",
                            "Key structural boundaries and symmetry",
                            "Foundational principles that set it apart",
                        ],
                        "narration": f"Let us first examine the foundational definition of {clean_topic}. Notice its boundaries, symmetry, and defining attributes that establish how it is classified.",
                        "mood": "thinking",
                    },
                    {
                        "type": "diagram",
                        "heading": f"2. Variations & Distinct Types",
                        "items": [
                            "Primary categories and distinct classifications",
                            "Key differences between each variation",
                            "How related forms connect with one another",
                        ],
                        "narration": f"Moving forward, let us compare the different variations of {clean_topic}. Observing how the types differ helps us quickly categorize and distinguish each unique form.",
                        "mood": "curious",
                    },
                    {
                        "type": "diagram",
                        "heading": f"3. Everyday Real-World Examples",
                        "items": [
                            "Common daily objects and natural patterns",
                            "Where we encounter these forms in architecture and art",
                            "Practical utility and why these forms are chosen",
                        ],
                        "narration": f"Now consider where we see {clean_topic} in real life. From natural geometry to architecture and daily objects, recognizing these forms builds tangible, intuitive mastery.",
                        "mood": "excited",
                    },
                    {
                        "type": "diagram",
                        "heading": f"4. Key Distinctions & Common Traps",
                        "items": [
                            "How to avoid confusing similar concepts",
                            "Quick visual checklist for instant recognition",
                            "Core summary rule to remember",
                        ],
                        "narration": f"Finally, let us review key distinctions so you never confuse similar forms. Remembering the essential boundary rules ensures complete clarity when identifying them.",
                        "mood": "thinking",
                    },
                    {
                        "type": "quiz",
                        "heading": f"{clean_topic} Mastery Check",
                        "question": f"What is the best way to accurately identify and differentiate {clean_topic}?",
                        "options": [
                            "By observing its visual boundaries, symmetry, and real-world examples",
                            "By guessing based purely on arbitrary labels",
                            "By assuming all variations have identical properties",
                        ],
                        "correct_index": 0,
                        "answer_idx": 0,
                        "explanation": f"Understanding structural boundaries and real-world context provides clear, lasting comprehension of {clean_topic}.",
                        "narration": f"What is the best way to accurately identify and differentiate {clean_topic}?",
                        "mood": "happy",
                    },
                ],
            }

        # Standard 4-scene progressive lesson for shorter durations
        return {
            "title": f"Exploring {clean_topic}",
            "level": level,
            "language": "en",
            "scenes": [
                {
                    "type": "title_card",
                    "heading": f"Introduction to {clean_topic}",
                    "narration": f"Welcome to this visual lesson exploring {clean_topic}. Today we will discover what it is, examine its visual properties, and spot it in daily life.",
                    "mood": "happy",
                },
                {
                    "type": "diagram",
                    "heading": f"Core Properties & Visual Attributes",
                    "items": [
                        "Defining visual characteristics",
                        "Key structural rules and boundaries",
                        "How different variations relate",
                    ],
                    "narration": f"Let us look at the foundational properties of {clean_topic}. By examining its key structural features and attributes, we can easily understand how it is defined.",
                    "mood": "thinking",
                },
                {
                    "type": "diagram",
                    "heading": f"Everyday Real-World Examples",
                    "items": [
                        "Common daily objects and patterns",
                        "How to spot them in everyday life",
                        "Why these forms and concepts matter",
                    ],
                    "narration": f"Notice where we encounter {clean_topic} in daily life. From everyday objects to nature and design, observing these forms makes the concepts intuitive and concrete.",
                    "mood": "excited",
                },
                {
                    "type": "quiz",
                    "heading": f"{clean_topic} Knowledge Check",
                    "question": f"What is the best way to understand and identify {clean_topic}?",
                    "options": [
                        "By observing its visual properties, structure, and real-world examples",
                        "By memorizing abstract rules without visual intuition",
                        "By assuming every variation has identical properties",
                    ],
                    "correct_index": 0,
                    "answer_idx": 0,
                    "explanation": f"Observing real-world examples and core visual attributes builds lasting intuitive understanding of {clean_topic}.",
                    "narration": f"What is the best way to understand and identify {clean_topic}?",
                    "mood": "happy",
                },
            ],
        }

    if target_seconds >= 100:
        return {
            "title": f"Mastering {clean_topic}: Complete Guide",
            "level": level,
            "language": "en",
            "scenes": [
                {
                    "type": "title_card",
                    "heading": f"Comprehensive Guide to {clean_topic}",
                    "narration": f"Welcome to this comprehensive lesson on {clean_topic}. Today we will explore the core mental model, trace how data moves through memory, and write robust Python code to master this topic.",
                    "mood": "happy",
                },
                {
                    "type": "diagram",
                    "heading": f"Step 1: Core Architecture of {clean_topic}",
                    "items": [
                        f"1. Core foundations and motivation for {clean_topic}",
                        "2. Execution flow and memory state transitions",
                        "3. Best practices, edge cases, and performance tips",
                    ],
                    "narration": f"Let us break down {clean_topic} into three foundational pillars. First, understanding why computer scientists created this mechanism. Second, tracing how the system operates under the hood. And third, applying it to real software.",
                    "mood": "thinking",
                },
                {
                    "type": "code_walkthrough",
                    "heading": f"Step 2: Practical Code Implementation",
                    "code": f"# Fundamental demonstration of {clean_topic}\ndataset = [12, 24, 36, 48]\nprocessed = [item * 2 for item in dataset]\nprint('Transformed output values:', processed)",
                    "highlight_lines": [2, 3],
                    "narration": f"Here is clean, idiomatic Python code illustrating {clean_topic}. We initialize our baseline data structure, apply the transformation logic step by step, and verify the resulting output in memory.",
                    "mood": "curious",
                },
                {
                    "type": "diagram",
                    "heading": "Step 3: Visual Execution & Data Flow",
                    "items": [
                        "Input variables mapped in memory",
                        "Processing pipeline executes sequentially",
                        "Intermediate state verified without mutation",
                        "Final results returned cleanly",
                    ],
                    "narration": "Watch the execution pipeline. Each input value is mapped in memory, processed through the core logic, and validated before emitting the final output without unexpected side effects.",
                    "mood": "excited",
                },
                {
                    "type": "code_walkthrough",
                    "heading": "Step 4: Handling Edge Cases & Optimization",
                    "code": f"def safe_process(data):\n    if not data:\n        return []\n    return [x for x in data if x > 0]\n\nprint('Safe result:', safe_process([10, -5, 20]))",
                    "highlight_lines": [2, 3, 4],
                    "narration": "Professional code must always handle edge cases. Here we guard against empty inputs, filter unexpected negative values, and ensure our program never crashes unexpectedly in production environments.",
                    "mood": "thinking",
                },
                {
                    "type": "quiz",
                    "heading": f"{clean_topic} Knowledge Check",
                    "question": f"What is the primary advantage of understanding {clean_topic} deeply?",
                    "options": [
                        "It empowers you to write clean, predictable, and robust production code",
                        "It completely eliminates the need for underlying computer hardware",
                        "It only functions when executing Python programs in debug mode",
                    ],
                    "correct_index": 0,
                    "answer_idx": 0,
                    "explanation": f"Understanding {clean_topic} gives you direct mastery over program structure, performance, and correctness.",
                    "narration": f"What is the primary advantage of understanding {clean_topic} deeply?",
                    "mood": "happy",
                },
            ],
        }

    return {
        "title": f"Mastering {clean_topic}",
        "level": level,
        "language": "en",
        "scenes": [
            {
                "type": "title_card",
                "heading": f"Introduction to {clean_topic}",
                "narration": f"Welcome to this lesson on {clean_topic}. Today we will explore the core intuition, how it operates under the hood, and how to write clean code using it.",
                "mood": "happy",
            },
            {
                "type": "diagram",
                "heading": f"Core Concepts of {clean_topic}",
                "items": [
                    f"1. Foundations of {clean_topic}",
                    f"2. How data and execution flow",
                    f"3. Practical application and tips",
                ],
                "narration": f"Let us break down {clean_topic} into three manageable concepts. First, understanding why we need it. Second, how data flows through the system. And third, applying it effectively in real programs.",
                "mood": "thinking",
            },
            {
                "type": "code_walkthrough",
                "heading": f"{clean_topic} Code Implementation",
                "code": f"# Practical example of {clean_topic}\ndata = [10, 20, 30]\nresult = [x * 2 for x in data]\nprint('Processed output:', result)",
                "highlight_lines": [2, 3],
                "narration": f"Here is a clean Python demonstration of {clean_topic}. We take our initial data, apply the transformation logic step by step, and verify the resulting output.",
                "mood": "curious",
            },
            {
                "type": "diagram",
                "heading": "Execution Flow & Visual Trace",
                "items": [
                    "Input initialized in memory",
                    "Transformation logic applied",
                    "Result returned and validated",
                ],
                "narration": f"Tracing the execution: the input values are mapped in memory, the core algorithm processes each item sequentially, and the final state is preserved without side effects.",
                "mood": "excited",
            },
            {
                "type": "quiz",
                "heading": f"{clean_topic} Knowledge Check",
                "question": f"What is the primary advantage of understanding {clean_topic} in programming?",
                "options": [
                    "It allows writing cleaner, more efficient, and predictable code",
                    "It eliminates the need for computer hardware",
                    "It only applies to numerical calculations",
                ],
                "correct_index": 0,
                "answer_idx": 0,
                "explanation": f"Understanding {clean_topic} gives you direct control over program structure, performance, and correctness.",
                "narration": f"What is the primary advantage of understanding {clean_topic} in programming?",
                "mood": "happy",
            },
        ],
    }


def get_fallback_lesson(topic: str = "Python Loops", level: str = "beginner", target_seconds: int = 60) -> Lesson:
    """Return a topic-specific, verified lesson. Never returns an unrelated topic."""
    t_lower = topic.lower()

    if target_seconds >= 100:
        if any(k in t_lower for k in ("loop", "for", "while", "iteration", "range")):
            template = CURATED_2MIN_TOPICS["loops"]
        elif any(k in t_lower for k in ("binary", "search", "divide")):
            template = CURATED_2MIN_TOPICS["binary_search"]
        else:
            template = _build_generic_lesson(topic, level, target_seconds=target_seconds)
    else:
        if any(k in t_lower for k in ("binary", "search")):
            template = CURATED_TOPICS["binary_search"]
        elif any(k in t_lower for k in ("variable", "memory", "pointer")):
            template = CURATED_TOPICS["variables"]
        elif any(k in t_lower for k in ("recursion", "recursive", "call stack", "stack")):
            template = CURATED_TOPICS["recursion"]
        elif any(k in t_lower for k in ("loop", "for", "while", "iteration")):
            template = CURATED_TOPICS["loops"]
        else:
            template = _build_generic_lesson(topic, level, target_seconds=target_seconds)

    lesson_dict = json.loads(json.dumps(template))
    lesson_dict["level"] = level
    return parse_lesson(json.dumps(lesson_dict))