import json
from schema import parse_lesson

FALLBACK = {
    "title": "How a Python loop works",
    "level": "beginner",
    "language": "en",
    "scenes": [
        {
            "type": "title_card",
            "heading": "How does a Python loop work?",
            "narration": "Welcome to this lesson on Python loops. A loop lets you repeat a block of code many times without writing it again and again. By the end, you will understand for loops and while loops with real examples.",
            "mood": "happy",
        },
        {
            "type": "code_walkthrough",
            "heading": "A simple for loop",
            "code": "for i in range(3):\n    print(i)",
            "highlight_lines": [1],
            "narration": "Here is the simplest for loop. The range function gives us three numbers: zero, one, and two. The variable i takes each value one by one. Each time, Python runs the indented line and prints the current value of i to the screen.",
            "mood": "curious",
        },
        {
            "type": "diagram",
            "heading": "Loop iterations step by step",
            "items": ["i = 0, print 0", "i = 1, print 1", "i = 2, print 2", "Loop ends"],
            "narration": "Let us trace what happens. In the first pass, i equals zero and Python prints zero. In the second pass, i equals one and it prints one. In the third pass, i equals two and it prints two. After that, there are no more values, so the loop ends.",
            "mood": "thinking",
        },
        {
            "type": "code_walkthrough",
            "heading": "Looping over a list",
            "code": "fruits = ['apple', 'banana']\nfor f in fruits:\n    print(f)",
            "highlight_lines": [2],
            "narration": "You can also loop over a list. Here we have a list of two fruits. The for loop picks each fruit one by one and stores it in the variable f. Then it prints that fruit. This pattern is used everywhere in Python programs.",
            "mood": "excited",
        },
        {
            "type": "diagram",
            "heading": "List iteration visualised",
            "items": ["Pick apple", "Print apple", "Pick banana", "Print banana"],
            "narration": "Think of it like a shopping bag. You reach in and pull out the first item, apple, and put it on the table. Then you reach in again and pull out banana. When the bag is empty, you stop. That is exactly what a for loop does with a list.",
            "mood": "happy",
        },
        {
            "type": "code_walkthrough",
            "heading": "Using range with start and stop",
            "code": "for n in range(1, 6):\n    print(n * n)",
            "highlight_lines": [1, 2],
            "narration": "Range can also take a start and stop value. Here we loop from one to five because range stops one before the end. Inside the loop, we compute n times n, which gives us the square of each number. So we get 1, 4, 9, 16, and 25.",
            "mood": "thinking",
        },
        {
            "type": "code_walkthrough",
            "heading": "A while loop example",
            "code": "count = 0\nwhile count < 3:\n    print(count)\n    count += 1",
            "highlight_lines": [2],
            "narration": "A while loop repeats as long as a condition is true. Here, we start count at zero. Each time, Python checks if count is less than three. If yes, it prints count and adds one. When count reaches three, the condition is false and the loop stops.",
            "mood": "curious",
        },
        {
            "type": "diagram",
            "heading": "For vs While: when to use which",
            "items": ["For: known count", "While: unknown count", "Both repeat code"],
            "narration": "Use a for loop when you know how many times to repeat, like looping over a list or a range. Use a while loop when you do not know in advance, like waiting for user input. Both types of loops save you from writing repetitive code. That is the power of loops in Python!",
            "mood": "excited",
        },
    ],
}


def get_fallback_lesson():
    return parse_lesson(json.dumps(FALLBACK))