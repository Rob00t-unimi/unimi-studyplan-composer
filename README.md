# UNIMI Study Plan Composer

An interactive web application designed to help Master's Degree students in Computer Science at the University of Milan (UNIMI) compose their study plan.

## Overview

This tool simplifies the process of selecting exams and verifying study plan requirements for both FBA (post-2025/26) and F94 (2014/15 - 2024/25) curricula. It provides a visual interface to explore available exams, check constraints, and organize your academic path.

## Features

- **Interactive Plan Composition**: Easily add or remove exams from your plan.
- **Curriculum Support**: Supports both **FBA** and **F94** curricula with specific rules.
- **Real-time Validation**: Instantly checks credit limits, mandatory exams, and special constraints (e.g., Table B + C sum).
- **Visual Feedback**: Progress bars and status indicators for credit requirements.
- **Exam Matrix**: Browse exams organized by Pillars and Subpillars across academic terms.
- **Search & Filter**: Quickly find exams by name.
- **Custom Exams**: Add external or free-choice exams not listed in the standard catalog.
- **CSV Export**: Download your study plan as a CSV file.
- **Bilingual**: Fully localized in English and Italian.
- **Responsive Design**: Works on desktop and mobile devices.

## How to Use

1.  **Select Configuration**: Choose the academic year and your specific curriculum (FBA or F94).
2.  **Browse Exams**: Explore the matrix of exams divided by areas (Pillars).
3.  **Add to Plan**: Click on an exam to add it to your plan. The system automatically assigns it to the most appropriate table based on rules.
4.  **Verify Status**: Check the sidebar for validation errors or missing credits.
5.  **Adjust**: Move exams between tables if needed, or add custom exams for free credits.
6.  **Export**: Download the final plan as a CSV file for your records.

## Project Structure

-   `index.html`: Main entry point and layout.
-   `js/app.js`: Vue.js application logic and state management.
-   `js/logic.js`: Core domain logic for plan management and validation rules (`PlanManager`).
-   `js/data.js`: Data loading and parsing (CSV/JSON).
-   `js/i18n.js`: Internationalization support.
-   `exams.csv`: Database of available exams.
-   `rules.json`: Configuration of degree requirements and rules.

## Technologies

-   **Vue 3**: Reactive frontend framework.
-   **Tailwind CSS**: Utility-first CSS framework for styling.
-   **PapaParse**: CSV parsing library.
-   **Phosphor Icons**: Icon set.

## Credits

-   **Roberto Tallarini**: Original concept and implementation.
-   **Jules & Gemini**: AI assistants for code refinement and refactoring.
-   **University of Milan**: Course data source.

## Disclaimer

This tool is an unofficial support aid. Always verify official rules and exam availability on the University of Milan website.
