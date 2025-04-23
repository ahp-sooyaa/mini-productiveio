import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router';
import {useAuth} from '../../contexts/AuthContext';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form.jsx";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/components/ui/input.jsx";
import {Button} from "@/components/ui/button.jsx";

function ResetPassword() {
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const {updatePassword} = useAuth();
    const navigate = useNavigate();

    const schema = z.object({
        password: z.string().min(6, {message: 'Password must be at least 6 characters'}),
        confirmPassword: z.string().min(6, {message: 'Password must be at least 6 characters'}),
    }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"]
    })

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValue: {
            password: '',
            confirmPassword: ''
        }
    })

    useEffect(() => {
        // Check if we're on the reset password page with a valid token
        const hash = window.location.hash;
        if (!hash || !hash.includes('type=recovery')) {
            setError('Invalid or expired password reset link');
        }
    }, []);

    const onSubmit = async (data) => {
        setError('');
        setMessage('');

        try {
            await updatePassword(data.password);

            setMessage('Password has been reset successfully!');
            setTimeout(() => navigate('/login'), 3000);
        } catch (error) {
            setError(error.message || 'Failed to reset password');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen p-5 bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center mb-6">Set New Password</h2>
                {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
                {message && <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-md">{message}</div>}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            name="password"
                            control={form.control}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="confirmPassword"
                            control={form.control}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                            {form.formState.isSubmitting ? 'Updating...' : 'Update password'}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}

export default ResetPassword;
