# Meridian — Student Operations Platform

Meridian is a student operations and abroad education consultancy CRM platform designed to streamline student applications, university shortlisting, document verification, payments, and lead workflows.

---

## 🚀 Features

- **Role-Based Access**: Dedicated dashboards for Admins and Employees.
  - **Admin**: Oversee consultants, leads, payments, audit logs, and organizational settings.
  - **Employee**: Manage assigned students, review applications, and verify documents.
- **Student Pipeline & CRM**: Comprehensive intake tracking, application statuses, and timeline milestones.
- **University Management**: Explore and filter global partner universities by country, intake, and requirements.
- **Document Portal & Vault**: Secure student document upload portals with tokenized access links.
- **Payment Records**: Fee collection tracking, invoicing statuses, and settlement logs.
- **Audit Trails**: Security and compliance event logging for all critical operations.
- **Modern Tech Stack**: React 19, TanStack Start & Router, Tailwind CSS v4, Radix UI, Zustand with local storage persistence.

---

## 🛠️ Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) / React 19
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/), Lucide Icons, Sonner
- **State Management**: Zustand (persisted)
- **Deployment**: Nitro preset for Vercel

---

## 💻 Getting Started

### Prerequisites

- Node.js 20+ (recommended Node 22+)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Hari564-tech/meridian-student-operations.git

# Navigate into the project directory
cd meridian-student-operations

# Install dependencies
npm install
```

### Development

To start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:8080`.

### Demo Credentials

You can use the built-in demo credentials on the login screen:
- **Admin**: `admin@demo.com` / `demo`
- **Employee**: `employee@demo.com` / `demo`

---

## 📦 Building & Deployment

### Build for Production

```bash
npm run build
```

This compiles the TanStack Start client bundle and server functions via Nitro for deployment.

### Deploy to Vercel

The project includes built-in Nitro configuration for Vercel (`nitro: { preset: 'vercel' }`):

1. Push this repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Vercel will automatically detect the settings and deploy.
