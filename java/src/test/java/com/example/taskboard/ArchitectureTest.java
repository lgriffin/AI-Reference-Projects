package com.example.taskboard;

import static com.tngtech.archunit.core.domain.JavaCall.Predicates.target;
import static com.tngtech.archunit.core.domain.properties.CanBeAnnotated.Predicates.metaAnnotatedWith;
import static com.tngtech.archunit.core.domain.properties.HasOwner.Predicates.With.owner;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** Architecture: the rules of AGENTS.md, executable. If one fails, fix the code, not the test. */
@AnalyzeClasses(packages = "com.example.taskboard", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    @ArchTest
    static final ArchRule layersOnlyDependDownwards = layeredArchitecture()
            .consideringOnlyDependenciesInLayers()
            .layer("api").definedBy("..api..")
            .layer("service").definedBy("..service..")
            .layer("repository").definedBy("..repository..")
            .layer("events").definedBy("..events..")
            .layer("config").definedBy("..config..")
            .layer("domain").definedBy("..domain..")
            .whereLayer("api").mayNotBeAccessedByAnyLayer()
            .whereLayer("events").mayNotBeAccessedByAnyLayer()
            .whereLayer("service").mayOnlyBeAccessedByLayers("api")
            .whereLayer("repository").mayOnlyBeAccessedByLayers("service")
            .whereLayer("config").mayOnlyBeAccessedByLayers("service");

    @ArchTest
    static final ArchRule theDomainIsFreeOfFrameworks = classes()
            .that().resideInAPackage("..domain..")
            .should().onlyDependOnClassesThat().resideInAnyPackage("java..", "..domain..");

    @ArchTest
    static final ArchRule onlyConfigReadsTheEnvironment = noClasses()
            .that().resideOutsideOfPackage("..config..")
            .should().callMethod(System.class, "getenv", String.class)
            .orShould().dependOnClassesThat().areAssignableTo(Environment.class)
            .orShould().dependOnClassesThat().areAssignableTo(Value.class);

    @ArchTest
    static final ArchRule onlyRepositoriesSpeakSql = noClasses()
            .that().resideOutsideOfPackage("..repository..")
            .should().dependOnClassesThat().resideInAnyPackage("java.sql..", "javax.sql..", "org.springframework.jdbc..");

    @ArchTest
    static final ArchRule onlyTheApiSpeaksHttp = noClasses()
            .that().resideOutsideOfPackage("..api..")
            .should().dependOnClassesThat().resideInAnyPackage("org.springframework.web..", "org.springframework.http..");

    @ArchTest
    static final ArchRule onlySpringConstructsCollaborators = noClasses()
            .should().callConstructorWhere(target(owner(metaAnnotatedWith(Component.class))));
}
