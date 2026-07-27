package com.example.taskmanager.service;

import com.example.taskmanager.domain.exception.UserNotFoundException;
import com.example.taskmanager.domain.model.User;
import com.example.taskmanager.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service encapsulating user-related business logic.
 */
@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id));
    }

    @Transactional
    public User create(String name, String email) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("A user with email '%s' already exists".formatted(email));
        }
        var user = new User();
        user.setName(name);
        user.setEmail(email);
        return userRepository.save(user);
    }

    @Transactional
    public User update(Long id, String name, String email) {
        User user = findById(id);
        if (name != null)  user.setName(name);
        if (email != null) user.setEmail(email);
        return userRepository.save(user);
    }

    @Transactional
    public void delete(Long id) {
        if (!userRepository.existsById(id)) {
            throw new UserNotFoundException(id);
        }
        userRepository.deleteById(id);
    }
}
