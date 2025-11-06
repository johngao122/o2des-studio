/**
 * Developer Mode Password Dialog
 *
 * Modal dialog for entering the developer mode password.
 * Dev mode disables syntax validation checking.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, AlertCircle } from 'lucide-react';
import { DevModeService } from '@/services/DevModeService';

interface DevModeDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export function DevModeDialog({
	isOpen,
	onClose,
	onSuccess,
}: DevModeDialogProps) {
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const devModeService = DevModeService.getInstance();

	// Focus input when dialog opens
	useEffect(() => {
		if (isOpen) {
			setPassword('');
			setError('');
			setTimeout(() => inputRef.current?.focus(), 100);
		}
	}, [isOpen]);

	// Handle ESC key to close dialog
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) {
				onClose();
			}
		};

		if (isOpen) {
			window.addEventListener('keydown', handleKeyDown);
		}

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen, onClose]);

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!password.trim()) {
			setError('Please enter a password');
			return;
		}

		if (devModeService.validatePassword(password)) {
			setPassword('');
			setError('');
			onSuccess();
			onClose();
		} else {
			setError('Incorrect password');
			setPassword('');
			inputRef.current?.focus();
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
			onClick={handleBackdropClick}
		>
			<div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full mx-4">
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-700">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
						Enable Developer Mode
					</h2>
					<Button
						onClick={onClose}
						variant="ghost"
						size="icon"
						className="h-8 w-8"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				<form onSubmit={handleSubmit} className="p-6">
					<div className="mb-6">
						<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
							Developer mode disables syntax validation checking. This is
							useful for testing or working with incomplete diagrams.
						</p>

						<div className="space-y-2">
							<label
								htmlFor="dev-password"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300"
							>
								Password
							</label>
							<input
								ref={inputRef}
								id="dev-password"
								type="password"
								value={password}
								onChange={(e) => {
									setPassword(e.target.value);
									setError('');
								}}
								className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm
                         bg-white dark:bg-zinc-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         placeholder:text-gray-400 dark:placeholder:text-gray-500"
								placeholder="Enter developer password"
								autoComplete="off"
							/>

							{error && (
								<div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
									<AlertCircle className="h-4 w-4" />
									<span>{error}</span>
								</div>
							)}
						</div>
					</div>

					<div className="flex items-center justify-end gap-3">
						<Button
							type="button"
							onClick={onClose}
							variant="outline"
							className="px-4"
						>
							Cancel
						</Button>
						<Button type="submit" className="px-4">
							Enable Dev Mode
						</Button>
					</div>
				</form>

				<div className="px-6 pb-6">
					<div className="pt-4 border-t border-gray-200 dark:border-zinc-700">
						<p className="text-xs text-gray-500 dark:text-gray-400 text-center">
							Press{' '}
							<kbd className="px-1 py-0.5 text-xs font-mono bg-gray-100 dark:bg-zinc-700 rounded">
								Esc
							</kbd>{' '}
							or click outside to close
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
