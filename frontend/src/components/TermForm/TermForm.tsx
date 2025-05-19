import React, { useState } from 'react';
import api from '../../services/api';
import '../../styles/dictionary.css';
import { data } from 'react-router-dom';

const TermForm = () => {
    const [word, setWord] = useState('');
    const [definition, setDefinition] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const normalizedKey = word.trim().toLowerCase();
            await api.put('/word', { 
                data: {
                    key: normalizedKey,
                    value: definition
                }
            });
            setMessage('success: Word and its definition saved successfully!');
            setWord('');
            setDefinition('');
        } catch (error) {
            setMessage('error: Error saving word definition');
        }
    };

    const handleDelete = async () => {
        try {
            const normalizedKey = word.trim().toLowerCase();
            await api.delete(`/word?key=${normalizedKey}`);
            setMessage('success: Word deleted successfully!');
            setWord('');
            setDefinition('');
        } catch (error) {
            setMessage('error: Error deleting word');
        }
    };

    return (
        <div className="term-form">
            <h2>📝 Add/Edit Word</h2>
            <form onSubmit={handleSubmit}>
                <input
                    placeholder="Type a word..."
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    required
                />
                <textarea
                    placeholder="Write the definition..."
                    value={definition}
                    onChange={(e) => setDefinition(e.target.value)}
                    rows={4}
                    required
                />
                <div className="button-group">
                    <button type="submit">💾 Save the word</button>
                    <button 
                        type="button"
                        onClick={handleDelete}
                        className="btn-delete"
                        disabled={!word}
                    >
                        🗑️ Delete word
                    </button>
                </div>
                {message && (
                    <div 
                        className="message"
                        data-success={message.startsWith('success') ? '' : undefined}
                        data-error={message.startsWith('error') ? '' : undefined}
                    >
                        {message.split(': ')[1]}
                    </div>
                )}
            </form>
        </div>
    );
};

export default TermForm;