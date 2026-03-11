# PhysioCompanion App

## Developers
- Eman
- Cieran
- Matthew
- Vaisnavi
- Maham

**Project Duration:** September 10, 2025 – Present

---

## Project Overview

According to the Global Burden of Diseases, Injuries and Risk Factors study performed in 2019, the number of individuals who would benefit from physical rehabilitation at least once in their lifetime is upwards of **2.41 billion globally** [Cieza et al., 2021].

Patients who attend physiotherapy sessions often struggle to correctly perform prescribed exercises once they return home. Research shows a disconnect between physiotherapist instruction and the patient’s ability to maintain **proper time-under-tension (TUT) and correct exercise form** when practicing independently [Faber et al., 2015].

While physiotherapists can guide patients during in-person assessments and follow-up appointments, the effectiveness of rehabilitation depends heavily on whether the patient performs exercises correctly outside the clinic.

This project aims to develop a **physiotherapy assistant application** that provides **real-time feedback and corrections** while users perform rehabilitation exercises. The goal is to help patients maintain correct exercise form and improve adherence to physiotherapy programs without requiring constant supervision.

---

## Application Architecture

The PhysioCompanion App consists of multiple components that work together to analyze exercise performance and provide feedback.

### Mobile Application (Frontend)

The mobile application allows patients to perform physiotherapy exercises and receive feedback.

Technologies used:
- React Native
- TypeScript
- Expo
- Firebase Authentication
- Firestore Database

Features include:
- User registration and login
- Recording rehabilitation exercises
- Live, real-time exercise feedback
- Viewing performance metrics

### Backend / Motion Analysis

The backend and exercise analysis components process movement data and generate feedback metrics.

Technologies used:
- Python
- OpenCV
- MediaPipe Pose Detection
- Pytest for backend testing

The motion analysis pipeline:
1. Captures video frames from the device camera
2. Detects body landmarks
3. Calculates knee angles and joint movement
4. Tracks repetitions and exercise form
5. Generates performance metrics for rehabilitation monitoring

### Database & Authentication

The application uses Firebase services for secure user and data management.

Services used:
- Firebase Authentication for user login and identity management
- Firestore for storing user data and exercise session results
- Firebase Security Rules for protecting data access

The database stores:
- User profiles
- Exercise session history
- Performance metrics generated from motion analysis

---

## Repository Structure

The folders and files for this project are organized as follows:

```text
.github/
    GitHub workflows and repository configuration files

.idea/
    IDE project settings

docs/
    Project documentation such as the SRS, V&V plan, and reports

mobile/
    Frontend mobile application built with React Native / Expo

poc_outputs/
    Proof-of-concept outputs, generated results, and supporting artifacts

src/
    Backend logic, motion analysis, and core application source files

test/
    Test cases for the project, including Python and JavaScript/TypeScript tests

.coverage
    Coverage report output for Python tests

.gitignore
    Git ignore rules

.gitmodules
    Git submodule configuration

CONTRIBUTING.md
    Contribution guidelines for the project

CodeOfConduct.md
    Code of conduct for contributors

ExceptionsGranted.md
    Project exceptions and granted allowances documentation

INSTALL.md
    Installation instructions for the project

LICENSE
    Project license information

README.md
    Project overview, setup instructions, and usage guide

package-lock.json
    Locked dependency versions for Node.js packages


