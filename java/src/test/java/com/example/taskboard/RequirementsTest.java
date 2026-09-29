package com.example.taskboard;

import static java.util.stream.Collectors.toCollection;
import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.MatchResult;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Requirements: every rule in REQUIREMENTS.md has a scenario, and every scenario cites a rule. */
class RequirementsTest {

    private static final Pattern ID = Pattern.compile("\\bR-[A-Z]+-\\d+\\b");

    // Scenarios describe the board's behaviour; the contract and architecture tests check machinery.
    private static final Pattern SCENARIO_PACKAGES = Pattern.compile(".*\\.(service|api|events)");

    @Test
    void everyRequirementHasAScenarioAndEveryCitationIsARequirement() throws IOException {
        Set<String> required = ids(Files.readString(Path.of("REQUIREMENTS.md")));
        Set<String> cited = new TreeSet<>();
        try (Stream<Path> files = Files.walk(Path.of("src/test/java"))) {
            for (Path file : files.filter(f -> f.toString().endsWith("Test.java") || f.toString().endsWith("Contract.java")).toList()) {
                cited.addAll(ids(Files.readString(file)));
            }
        }
        assertThat(required).as("requirements with no scenario; add a test whose @DisplayName opens with the id")
                .isSubsetOf(cited);
        assertThat(cited).as("ids cited by tests but not stated in REQUIREMENTS.md; state the rule first")
                .isSubsetOf(required);
    }

    @Test
    void everyScenarioCitesARequirement() {
        List<String> uncited = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.ONLY_INCLUDE_TESTS)
                .importPackages("com.example.taskboard")
                .stream()
                .filter(type -> SCENARIO_PACKAGES.matcher(type.getPackageName()).matches())
                .flatMap(type -> type.getMethods().stream())
                .filter(method -> method.isAnnotatedWith(Test.class) && !citesARequirement(method))
                .map(JavaMethod::getFullName)
                .toList();
        assertThat(uncited)
                .as("scenarios citing no requirement; open each @DisplayName with its ids, then given / when / then")
                .isEmpty();
    }

    private static boolean citesARequirement(JavaMethod method) {
        return method.tryGetAnnotationOfType(DisplayName.class)
                .map(name -> name.value().matches("^R-[A-Z]+-\\d+.*"))
                .orElse(false);
    }

    private static Set<String> ids(String text) {
        return ID.matcher(text).results().map(MatchResult::group).collect(toCollection(TreeSet::new));
    }
}
