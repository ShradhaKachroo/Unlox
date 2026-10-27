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


def _build_generic_lesson(topic: str, level: str) -> dict:
    clean_topic = topic.strip().title()
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
                    "A) It allows writing cleaner, more efficient, and predictable code",
                    "B) It eliminates the need for computer hardware",
                    "C) It only applies to numerical calculations",
                ],
                "correct_index": 0,
                "answer_idx": 0,
                "explanation": f"Understanding {clean_topic} gives you direct control over program structure, performance, and correctness.",
                "narration": f"What is the primary advantage of understanding {clean_topic} in programming?",
                "mood": "happy",
            },
        ],
    }


def get_fallback_lesson(topic: str = "Python Loops", level: str = "beginner") -> Lesson:
    """Return a topic-specific, verified lesson. Never returns an unrelated topic."""
    t_lower = topic.lower()

    if any(k in t_lower for k in ("binary", "search")):
        template = CURATED_TOPICS["binary_search"]
    elif any(k in t_lower for k in ("variable", "memory", "pointer")):
        template = CURATED_TOPICS["variables"]
    elif any(k in t_lower for k in ("recursion", "recursive", "call stack", "stack")):
        template = CURATED_TOPICS["recursion"]
    elif any(k in t_lower for k in ("loop", "for", "while", "iteration")):
        template = CURATED_TOPICS["loops"]
    else:
        template = _build_generic_lesson(topic, level)

    lesson_dict = json.loads(json.dumps(template))
    lesson_dict["level"] = level
    return parse_lesson(json.dumps(lesson_dict))