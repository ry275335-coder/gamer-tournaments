#!/usr/bin/env python3
"""
Script to simplify the gamer-tournaments website UI.
Applies consistent light theme and simplified styling.
"""

import os
import re
import glob

# CSS class replacements for dark -> light theme and simplification
replacements = [
    # Backgrounds
    (r'bg-\[#080b12\]', 'bg-white'),
    (r'bg-black', 'bg-gray-50'),
    (r'bg-black/20', 'bg-gray-100'),
    (r'bg-black/30', 'bg-gray-200'),
    (r'bg-black/40', 'bg-gray-300'),
    (r'bg-black/5', 'bg-gray-50'),
    (r'bg-black/10', 'bg-gray-100'),
    (r'bg-black/\\[0\\.03\\]', 'bg-gray-50'),
    (r'bg-black/\\[0\\.02\\]', 'bg-gray-50'),
    (r'bg-black/\\[0\\.04\\]', 'bg-gray-100'),
    (r'bg-black/\\[0\\.05\\]', 'bg-gray-100'),
    (r'bg-black/\\[0\\.07\\]', 'bg-gray-200'),
    (r'bg-black/\\[0\\.09\\]', 'bg-gray-200'),
    (r'bg-black/\\[0\\.06\\]', 'bg-gray-100'),
    (r'bg-black/\\[0\\.08\\]', 'bg-gray-200'),
    (r'bg-black/\\[0\\.01\\]', 'bg-gray-50'),
    (r'bg-white/\\[0\\.03\\]', 'bg-gray-50'),
    (r'bg-white/\\[0\\.02\\]', 'bg-white'),
    (r'bg-white/\\[0\\.05\\]', 'bg-gray-50'),
    (r'bg-white/\\[0\\.04\\]', 'bg-gray-50'),
    (r'bg-white/\\[0\\.07\\]', 'bg-gray-100'),
    (r'bg-white/\\[0\\.09\\]', 'bg-gray-100'),
    (r'bg-white/\\[0\\.06\\]', 'bg-gray-50'),
    (r'bg-white/\\[0\\.08\\]', 'bg-gray-100'),
    (r'bg-red-500/10', 'bg-red-50'),
    (r'bg-red-500/20', 'bg-red-100'),
    (r'bg-red-500/30', 'bg-red-100'),
    (r'bg-green-400/10', 'bg-green-50'),
    (r'bg-green-400/20', 'bg-green-100'),
    (r'bg-green-400/5', 'bg-green-50'),
    (r'bg-green-500/10', 'bg-green-50'),
    (r'bg-green-500/20', 'bg-green-100'),
    (r'bg-yellow-400/10', 'bg-yellow-50'),
    (r'bg-yellow-400/20', 'bg-yellow-100'),
    (r'bg-blue-400/10', 'bg-blue-50'),
    (r'bg-blue-400/20', 'bg-blue-100'),
    (r'bg-purple-400/10', 'bg-purple-50'),
    (r'bg-purple-400/20', 'bg-purple-100'),
    (r'bg-gray-400/10', 'bg-gray-50'),
    (r'bg-gray-400/20', 'bg-gray-100'),
    (r'bg-gray-500/10', 'bg-gray-50'),
    (r'bg-gray-500/20', 'bg-gray-100'),

    # Borders
    (r'border-white/10', 'border-gray-200'),
    (r'border-white/20', 'border-gray-300'),
    (r'border-white/30', 'border-gray-300'),
    (r'border-white/40', 'border-gray-400'),
    (r'border-white/50', 'border-gray-400'),
    (r'border-white/\\[0\\.03\\]', 'border-gray-200'),
    (r'border-white/\\[0\\.02\\]', 'border-gray-200'),
    (r'border-white/\\[0\\.04\\]', 'border-gray-200'),
    (r'border-white/\\[0\\.05\\]', 'border-gray-200'),
    (r'border-white/\\[0\\.07\\]', 'border-gray-300'),
    (r'border-white/\\[0\\.09\\]', 'border-gray-300'),
    (r'border-white/\\[0\\.06\\]', 'border-gray-200'),
    (r'border-white/\\[0\\.08\\]', 'border-gray-300'),
    (r'border-white/\\[0\\.01\\]', 'border-gray-200'),
    (r'border-gray-400/20', 'border-gray-300'),
    (r'border-red-400/20', 'border-red-300'),
    (r'border-red-500/10', 'border-red-200'),
    (r'border-red-500/20', 'border-red-300'),
    (r'border-green-400/20', 'border-green-300'),
    (r'border-green-400/30', 'border-green-300'),
    (r'border-green-500/10', 'border-green-200'),
    (r'border-green-500/20', 'border-green-300'),
    (r'border-yellow-400/20', 'border-yellow-300'),
    (r'border-blue-400/20', 'border-blue-300'),
    (r'border-purple-400/20', 'border-purple-300'),

    # Text colors
    (r'text-white', 'text-black'),
    (r'text-gray-400', 'text-gray-600'),
    (r'text-gray-300', 'text-gray-500'),
    (r'text-gray-200', 'text-gray-400'),
    (r'text-gray-100', 'text-gray-600'),
    (r'text-gray-50', 'text-gray-600'),
    (r'text-gray-600', 'text-gray-700'),
    (r'text-green-400', 'text-green-600'),
    (r'text-green-300', 'text-green-500'),
    (r'text-red-400', 'text-red-600'),
    (r'text-red-300', 'text-red-500'),
    (r'text-yellow-400', 'text-yellow-600'),
    (r'text-yellow-300', 'text-yellow-500'),
    (r'text-blue-400', 'text-blue-600'),
    (r'text-blue-300', 'text-blue-500'),
    (r'text-purple-400', 'text-purple-600'),
    (r'text-purple-300', 'text-purple-500'),

    # Simplify rounded corners
    (r'rounded-2xl', 'rounded-xl'),
    (r'rounded-3xl', 'rounded-2xl'),
    (r'rounded-full', 'rounded-lg'),

    # Simplify spacing/padding
    (r'py-24', 'py-12'),
    (r'py-20', 'py-10'),
    (r'py-16', 'py-8'),
    (r'px-6', 'px-4'),
    (r'px-5', 'px-4'),
    (r'py-6', 'py-4'),
    (r'py-3', 'py-2'),
    (r'px-3', 'px-2'),
    (r'pt-6', 'pt-4'),
    (r'pb-6', 'pb-4'),
    (r'pl-6', 'pl-4'),
    (r'pr-6', 'pr-4'),
    (r'p-7', 'p-5'),
    (r'p-6', 'p-4'),
    (r'p-5', 'p-4'),
    (r'p-4', 'p-3'),
    (r'gap-6', 'gap-4'),
    (r'gap-5', 'gap-4'),
    (r'gap-10', 'gap-6'),
    (r'gap-8', 'gap-6'),
    (r'space-y-5', 'space-y-4'),
    (r'space-y-4', 'space-y-3'),
    (r'space-x-6', 'space-x-4'),
    (r'space-x-5', 'space-x-4'),

    # Remove complex hover effects and transitions for simplicity
    (r'hover:-translate-y-1', ''),
    (r'hover:-translate-y-2', ''),
    (r'hover:border-green-400/40', 'hover:border-green-500'),
    (r'hover:bg-white/5', 'hover:bg-gray-100'),
    (r'hover:bg-green-300', 'hover:bg-green-400'),
    (r'hover:bg-yellow-300', 'hover:bg-yellow-400'),
    (r'hover:bg-red-400', 'hover:bg-red-300'),
    (r'duration-500', 'duration-300'),
    (r'duration-300', 'duration-200'),
    (r'transition duration-', 'transition '),

    # Simplify font weights
    (r'font-black', 'font-bold'),
    (r'font-semibold', 'font-medium'),

    # Remove complex shadow effects
    (r'shadow-2xl', 'shadow-md'),
    (r'shadow-xl', 'shadow-lg'),

    # Remove blur effects
    (r'blur-3xl', ''),
    (r'blur-2xl', ''),
    (r'blur-xl', ''),

    # Remove animate-pulse
    (r'animate-pulse', ''),

    # Clean up extra spaces and empty classes
    (r'  +', ' '),
    (r' class=""', ''),
    (r' class=" "', ''),
]

def simplify_file(file_path):
    """Apply simplifications to a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Apply all replacements
        for pattern, replacement in replacements:
            content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)

        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Simplified: {file_path}")
            return True
        else:
            print(f"No changes: {file_path}")
            return False

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function to simplify all relevant files."""
    # Define files to process
    files_to_process = [
        # Pages
        "app/page.tsx",
        "app/tournaments/page.tsx",
        "app/login/page.tsx",
        "app/register/page.tsx",
        "app/dashboard/page.tsx",
        "app/admin/page.tsx",
        "app/organizer/page.tsx",
        "app/organizer/apply/page.tsx",
        "app/organizer/login/page.tsx",
        "app/organizer/squads/page.tsx",
        "app/organizer/tournaments/[id]/page.tsx",
        "app/tournaments/[id]/page.tsx",
        "app/tournaments/[id]/squad/page.tsx",
        "app/tournaments/[id]/squad/[squadId]/page.tsx",
        # Lib
        "lib/supabase.ts",
        # Config
        "next.config.ts",
        "tailwind.config.js" if os.path.exists("tailwind.config.js") else None,
        "postcss.config.mjs",
        "globals.css"
    ]

    # Filter out None values and files that don't exist
    files_to_process = [f for f in files_to_process if f is not None and os.path.exists(f)]

    print(f"Processing {len(files_to_process)} files...")

    simplified_count = 0
    for file_path in files_to_process:
        if simplify_file(file_path):
            simplified_count += 1

    print(f"\nSimplified {simplified_count} out of {len(files_to_process)} files.")

if __name__ == "__main__":
    main()