import {useState} from 'react';
import {Link} from 'react-router';
import {useAuth} from '../../contexts/AuthContext';
import {z} from 'zod';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form.jsx";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Input} from "@/components/ui/input.jsx";
import {Button} from "@/components/ui/button.jsx";

function ForgotPassword() {
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const {resetPassword} = useAuth();

    const schema = z.object({
        email: z.string().email()
    });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            email: '',
        }
    })

    const onSubmit = async (data) => {
        setError('');
        setMessage('');

        try {
            await resetPassword(data.email);
            setMessage('Password reset email sent. Check your inbox for further instructions.');
        } catch (error) {
            setError(error.message || 'Failed to reset password');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen p-5 bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center mb-6">Reset Password</h2>
                {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
                {message && <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-md">{message}</div>}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            name="email"
                            control={form.control}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="text" placeholder="you@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                        <Button
                            type="submit"
                            disabled={form.formState.isSubmitting}
                            className="w-full"
                        >
                            {form.formState.isSubmitting ? 'Sending...' : 'Reset Password'}
                        </Button>
                    </form>
                </Form>
                <div className="flex justify-center mt-3">
                    <Button asChild variant='link'>
                        <Link to="/login">Back to Login</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;
