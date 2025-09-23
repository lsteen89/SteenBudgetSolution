// EmailConfirmationPage.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import EmailConfirmationPage from './EmailConfirmationPage';

// Mocks
const mockVerifySuccess = async () => Promise.resolve();
const mockVerifyAlreadyDone = async () => { throw new Error('This email has already been verified.'); };
const mockVerifyGenericError = async () => { throw new Error('The verification link is invalid or has expired.'); };

const meta: Meta<typeof EmailConfirmationPage> = {
    title: 'Pages/EmailConfirmationPage',
    component: EmailConfirmationPage,
    parameters: {
        reactRouter: {
            routePath: '/email-confirmation',
            routing: { initialEntries: ['/email-confirmation?token=a-valid-storybook-token'] },
        },
    },
    args: {
        navigateOnMissingToken: false, // avoid Storybook 404
    },
    tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {
    args: {
        verifyEmail: mockVerifySuccess,
        navigateOnMissingToken: true,
        debugToken: "fdsaf"
    },
};

export const AlreadyVerified: Story = {
    args: { verifyEmail: mockVerifyAlreadyDone },
};

export const GenericError: Story = {
    args: { verifyEmail: mockVerifyGenericError },
};

export const MissingToken: Story = {
    parameters: {
        reactRouter: {
            routing: { initialEntries: ['/verify-email'] }, // no token
            routePath: '/verify-email',
        },
    },
    args: {
        verifyEmail: mockVerifySuccess,
        navigateOnMissingToken: false, // render inline error instead of navigating to /404
    },
};
